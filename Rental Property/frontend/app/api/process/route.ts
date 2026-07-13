import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  WorkingPaper,
  ProcessingResult,
  RentalSection,
  Transaction,
  createEmptySection,
  calculateSectionTotals,
  combineSections,
} from '@/types/workingPaper';
import { findDuplicates, getDuplicateStats } from '@/lib/duplicate-detection';
import { classifyExpense, classifyExpenses } from '@/lib/ato-classification';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Helper function to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

// Helper function to process a single file with Claude
async function processFileWithClaude(
  file: File,
  fileType: 'agent' | 'supporting'
): Promise<any | { error: string }> {
  let content: any[] = [];
  const mimeType = file.type;

  if (mimeType === 'text/plain') {
    const textContent = await file.text();
    content = [
      {
        type: 'text',
        text: `Analyze this ${fileType} document:\n\n${textContent}`,
      },
    ];
  } else if (mimeType === 'application/pdf') {
    const base64Data = await fileToBase64(file);
    content = [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data,
        },
      },
      {
        type: 'text',
        text: `Analyze this ${fileType} PDF document.`,
      },
    ];
  } else if (mimeType.startsWith('image/')) {
    const base64Data = await fileToBase64(file);
    const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    content = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      },
      {
        type: 'text',
        text: `Analyze this ${fileType} image document.`,
      },
    ];
  } else if (
    mimeType === 'text/csv' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    // For Excel/CSV, we'll try to read as text first
    try {
      const textContent = await file.text();
      content = [
        {
          type: 'text',
          text: `Analyze this ${fileType} spreadsheet/CSV document:\n\n${textContent}`,
        },
      ];
    } catch {
      // If text reading fails, return empty data
      return null;
    }
  } else {
    return null;
  }

  const systemPrompt =
    fileType === 'agent'
      ? `You are an expert at analyzing rental property agent statements and extracting financial data.

Extract ALL individual transactions (income and expenses) from this document as separate line items. Return ONLY valid JSON with this structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD format if available",
      "amount": number (positive for income, positive for expenses too),
      "description": "clear description of the transaction",
      "category": "one of: Gross rental income, Water usage income, Other income received, Advertising for tenants, Body corporate fees, Borrowing costs, Cleaning, Council rates, Capital works deductions (Div-43), Capital allowance deduction (Div-40), Gardening/lawn mowing, Insurance, Interest on loans, Land tax, Legal fees, Pest control, Property agent fees, Repairs & maintenance, Stationery, Water rates, Other rental expenses",
      "type": "income or expense"
    }
  ],
  "clientName": "owner/landlord/client name",
  "propertyAddress": "rental property address",
  "periodStart": "date in YYYY-MM-DD format if available",
  "periodEnd": "date in YYYY-MM-DD format if available",
  "interestSummary": {
    "totalInterest": number (total interest paid if available),
    "lender": "bank or lender name if shown",
    "loanAccount": "loan account number if shown"
  }
}

IMPORTANT:
- ONLY extract NET/TOTAL amounts from the Total column - DO NOT include individual positive and negative amounts that sum to the total
- For example: if pest control shows +$165 and -$165 with Total $0, only include ONE transaction with amount $0
- If an item shows multiple entries that net out, use ONLY the final Total column value
- Include the date for each transaction if visible
- Use clear, descriptive text for each transaction
- All amounts should be positive numbers
- SKIP "Owner Contribution" or "Owners Contribution" completely - do NOT include these as transactions
- Owner contributions are NOT rental income - they are the owner's own money and should be excluded
- CRITICAL: The amount MUST be the TOTAL amount including GST
- For Water Rates: Use the TOTAL column value (e.g., if shows $250.22 + GST = $259.75, use 259.75)
- For ALL expenses with GST: Always use the final total after GST is added
- Look for the "Total" column in statements - this is the amount to extract
- Do NOT create separate line items for GST - include GST in the main transaction amount
- If interest on loans is mentioned, also populate the interestSummary`
      : `You are an expert at analyzing rental property expense documents (invoices, receipts, etc).

Extract the expense transaction from this document. Return ONLY valid JSON with this structure:
{
  "date": "YYYY-MM-DD format if available",
  "amount": number (total amount INCLUDING GST),
  "description": "clear description of what this expense is for",
  "category": "one of: Advertising for tenants, Body corporate fees, Borrowing costs, Cleaning, Council rates, Capital works deductions (Div-43), Capital allowance deduction (Div-40), Gardening/lawn mowing, Insurance, Interest on loans, Land tax, Legal fees, Pest control, Property agent fees, Repairs & maintenance, Stationery, Water rates, Other rental expenses",
  "councilRatesDetail": {
    "isQuarterly": boolean,
    "quarters": [{"quarter": "Q1/Q2/Q3/Q4", "amount": number, "dueDate": "YYYY-MM-DD"}] (if council rates with quarterly breakdown)
  },
  "insuranceDetail": {
    "policyPeriodStart": "YYYY-MM-DD",
    "policyPeriodEnd": "YYYY-MM-DD",
    "annualPremium": number,
    "apportionedAmount": number (amount for the relevant tax year period)
  },
  "interestDetail": {
    "loanAmount": number,
    "annualInterest": number,
    "lender": "bank name"
  }
}

Categorize the expense into the most appropriate category. All amounts should be positive numbers.

IMPORTANT:
- The amount MUST be the TOTAL GST-inclusive amount (look for "Total" column if available)
- For WATER RATES and utilities: Always use the total after GST (e.g., $250.22 + GST = $259.75, use 259.75)
- For COUNCIL RATES: If invoice shows quarterly installments, extract all 4 quarters with their totals
- For INSURANCE: Calculate the apportioned amount for the tax year (July 1 to June 30)
- For INTEREST: Extract loan details if shown
- ALWAYS use the final total amount that includes GST, never just the base amount`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-fable-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    // Clean and parse JSON
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log(`Claude response for ${file.name} (first 500 chars):`, cleanedResponse.substring(0, 500));

    return JSON.parse(cleanedResponse);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error processing ${file.name}:`, errorMsg);

    // Check for billing/credit issues
    if (errorMsg.includes('credit balance') || errorMsg.includes('low to access')) {
      console.error('BILLING ERROR: Insufficient credits in Anthropic account');
    }

    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();

    // Get financial year from form data
    const financialYear = formData.get('financialYear') as string || '2025';
    const fyNumber = parseInt(financialYear);

    // Calculate date range for the financial year
    const fyStartDate = new Date(`${fyNumber - 1}-07-01`);
    const fyEndDate = new Date(`${fyNumber}-06-30`);

    // Get all agent files
    const agentFiles: File[] = [];
    let agentIndex = 0;
    while (formData.get(`agentFile${agentIndex}`)) {
      agentFiles.push(formData.get(`agentFile${agentIndex}`) as File);
      agentIndex++;
    }

    // Get all supporting files
    const supportingFiles: File[] = [];
    let supportingIndex = 0;
    while (formData.get(`supportingFile${supportingIndex}`)) {
      supportingFiles.push(formData.get(`supportingFile${supportingIndex}`) as File);
      supportingIndex++;
    }

    if (agentFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one agent file is required' },
        { status: 400 }
      );
    }

    console.log(`Processing ${agentFiles.length} agent files and ${supportingFiles.length} supporting files`);

    // Process all agent files
    const agentResults = await Promise.all(
      agentFiles.map(file => processFileWithClaude(file, 'agent'))
    );

    // Process all supporting files
    const supportingResults = await Promise.all(
      supportingFiles.map(file => processFileWithClaude(file, 'supporting'))
    );

    // Collect all transactions and track failed files
    let allTransactions: any[] = [];
    const failedFiles: string[] = [];
    let clientName = '';
    let extractedAddress = '';
    let periodStart: string | undefined;
    let periodEnd: string | undefined;

    // Initialize summaries
    let interestSummary: any = {
      totalInterest: 0,
      daysRented: 0,
      daysTotal: 365,
    };
    let hasInterestData = false;

    // Generate unique transaction IDs
    let transactionCounter = 0;

    // Process agent file results
    agentResults.forEach((result, index) => {
      const fileName = agentFiles[index].name;

      if (!result) {
        failedFiles.push(fileName);
        return;
      }

      // Extract property details from first file
      if (index === 0) {
        if (result.clientName) clientName = result.clientName;
        if (result.propertyAddress) extractedAddress = result.propertyAddress;
        if (result.periodStart) periodStart = result.periodStart;
        if (result.periodEnd) periodEnd = result.periodEnd;
      }

      // Extract interest summary if present
      if (result.interestSummary && result.interestSummary.totalInterest) {
        hasInterestData = true;
        interestSummary.totalInterest += result.interestSummary.totalInterest;
        if (result.interestSummary.lender) interestSummary.lender = result.interestSummary.lender;
        if (result.interestSummary.loanAccount) interestSummary.loanAccount = result.interestSummary.loanAccount;
      }

      // Extract transactions from agent file
      if (result.transactions && Array.isArray(result.transactions)) {
        result.transactions.forEach((tx: any) => {
          // Check if this is an owner contribution and skip it
          const category = (tx.category || '').toLowerCase();
          const description = (tx.description || '').toLowerCase();

          if (category.includes('owner contribution') ||
              description.includes('owner contribution') ||
              description.includes('owners contribution') ||
              description.includes('owner fund')) {
            console.log(`Skipping owner contribution in agent file: ${tx.description} - $${tx.amount}`);
            return; // Skip this transaction entirely
          }

          allTransactions.push({
            id: `tx_${++transactionCounter}`, // Add unique ID
            date: tx.date || '',
            amount: tx.amount || 0,
            description: tx.description || '',
            category: tx.category || '',
            sourceFile: fileName,
            type: tx.type || 'expense',
            section: 'Agent Summary'
          });
        });
      }
    });

    // Process supporting file results
    supportingResults.forEach((result, index) => {
      const fileName = supportingFiles[index].name;

      if (!result) {
        failedFiles.push(fileName);
        return;
      }

      // Extract special details from supporting documents
      const transaction: Transaction = {
        id: `tx_${++transactionCounter}`, // Add unique ID
        date: result.date || '',
        amount: result.amount || 0,
        description: result.description || '',
        category: result.category || '',
        sourceFile: fileName,
        type: 'expense',
        section: 'Items Other Than Agent Summary'
      };

      // Handle council rates with quarterly breakdown
      if (result.councilRatesDetail) {
        transaction.councilRatesDetail = result.councilRatesDetail;
      }

      // Handle insurance with apportionment
      if (result.insuranceDetail) {
        transaction.insuranceDetail = result.insuranceDetail;
        // Use apportioned amount if available
        if (result.insuranceDetail.apportionedAmount) {
          transaction.amount = result.insuranceDetail.apportionedAmount;
        }
      }

      // Handle interest details
      if (result.interestDetail) {
        transaction.interestDetail = result.interestDetail;
        hasInterestData = true;
        interestSummary.totalInterest += result.interestDetail.annualInterest || result.amount;
        if (result.interestDetail.lender) interestSummary.lender = result.interestDetail.lender;
        if (result.interestDetail.loanAmount) interestSummary.loanAmount = result.interestDetail.loanAmount;
      }

      allTransactions.push(transaction);
    });

    // ========== DUPLICATE DETECTION ==========
    console.log('Running duplicate detection on', allTransactions.length, 'transactions.');
    const { transactionsWithStatus, duplicates } = findDuplicates(allTransactions);
    const duplicateStats = getDuplicateStats(transactionsWithStatus);

    console.log('Duplicate detection results:', {
      total: duplicateStats.totalTransactions,
      unique: duplicateStats.uniqueTransactions,
      possibleDuplicates: duplicateStats.possibleDuplicates,
      confirmedDuplicates: duplicateStats.confirmedDuplicates,
      potentialSavings: duplicateStats.potentialSavings
    });

    // Replace allTransactions with the enhanced version that includes duplicate status
    allTransactions = transactionsWithStatus;

    // ========== ATO CLASSIFICATION ==========
    console.log('Running ATO classification on expense transactions...');
    const expenseTransactions = allTransactions.filter((tx: Transaction) => tx.type === 'expense');

    // Prepare expenses for classification
    const expensesToClassify = expenseTransactions.map((tx: Transaction) => ({
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      category: tx.category,
      propertyAcquiredDate: undefined, // Could be extracted from property details
      isNewProperty: false
    }));

    // Classify all expenses
    const { classifications, summary: classificationSummary } = classifyExpenses(expensesToClassify);

    // Apply classification results to transactions
    classifications.forEach((result, index) => {
      const tx = expenseTransactions[index];
      tx.atoClassification = result.classification;
      tx.atoClassificationConfidence = result.confidence;
      tx.atoClassificationReasons = result.reasoning;
      tx.atoReference = result.atoReference;

      if (result.depreciationDetails) {
        tx.depreciationDetails = result.depreciationDetails;
      }
    });

    console.log('ATO classification results:', {
      immediateDeductions: classificationSummary.immediateDeductions,
      capitalImprovements: classificationSummary.capitalImprovements,
      initialRepairs: classificationSummary.initialRepairs,
      needsReview: classificationSummary.needsReview,
      totalCapitalAmount: classificationSummary.totalCapitalAmount
    });

    // Create sections for agent summary and supporting documents
    const agentSummary = createEmptySection();
    const itemsOtherThanAgentSummary = createEmptySection();

    // Helper to map category to expense field
    const mapCategoryToExpenseField = (category: string): string | null => {
      const cat = category.toLowerCase();
      if (cat.includes('advertising')) return 'advertisingForTenants';
      if (cat.includes('body corporate') || cat.includes('strata')) return 'bodyCorporateFees';
      if (cat.includes('borrowing')) return 'borrowingCosts';
      if (cat.includes('cleaning')) return 'cleaning';
      if (cat.includes('council rate')) return 'councilRates';
      if (cat.includes('div-43') || cat.includes('capital works')) return 'capitalWorksDeductions';
      if (cat.includes('div-40') || cat.includes('capital allowance')) return 'capitalAllowanceDeduction';
      if (cat.includes('garden') || cat.includes('lawn') || cat.includes('mowing')) return 'gardeningLawnMowing';
      if (cat.includes('insurance')) return 'insurance';
      if (cat.includes('interest')) return 'interestOnLoans';
      if (cat.includes('land tax')) return 'landTax';
      if (cat.includes('legal')) return 'legalFees';
      if (cat.includes('pest')) return 'pestControl';
      if (cat.includes('agent') || cat.includes('management fee')) return 'propertyAgentFees';
      if (cat.includes('repair') || cat.includes('maintenance')) return 'repairsMaintenance';
      if (cat.includes('stationery')) return 'stationery';
      if (cat.includes('water rate')) return 'waterRates';
      return 'otherRentalExpenses';
    };

    allTransactions.forEach((tx: Transaction) => {
      const section = tx.section === 'Agent Summary' ? agentSummary : itemsOtherThanAgentSummary;

      // Skip duplicates that are marked as excluded
      if (tx.includeInTotal === false) {
        console.log(`Excluding duplicate transaction: ${tx.description} - $${tx.amount} (confidence: ${tx.duplicateConfidence}%)`);
        return;
      }

      // Check if transaction falls within the financial year
      // If date is not provided, include it by default
      if (tx.date) {
        const txDate = new Date(tx.date);
        if (txDate < fyStartDate || txDate > fyEndDate) {
          console.log(`Excluding transaction outside FY${financialYear}: ${tx.description} on ${tx.date}`);
          return; // Skip transactions outside the financial year
        }
      }

      // Aggregate based on type and category
      if (tx.type === 'income') {
        const cat = tx.category.toLowerCase();
        const desc = tx.description ? tx.description.toLowerCase() : '';

        // EXCLUDE owner contributions from income - check both category AND description
        if (cat.includes('owner') && (cat.includes('contribution') || cat.includes('fund')) ||
            desc.includes('owner') && (desc.includes('contribution') || desc.includes('fund')) ||
            cat === 'owner contribution' ||
            desc.includes('owners contribution')) {
          console.log(`Excluding owner contribution from income: ${tx.description} (category: ${tx.category}) - $${tx.amount}`);
          return; // Skip owner contributions completely
        }

        if (cat.includes('gross rental')) {
          section.income.grossRentalIncome += tx.amount;
        } else if (cat.includes('water') && cat.includes('usage')) {
          section.income.waterUsageIncome += tx.amount;
        } else {
          section.income.otherIncomeReceived += tx.amount;
        }
      } else if (tx.type === 'expense') {
        const field = mapCategoryToExpenseField(tx.category);
        if (field && field in section.expenses) {
          (section.expenses as any)[field] += tx.amount;
        }
      }
    });

    // Calculate totals for each section
    calculateSectionTotals(agentSummary);
    calculateSectionTotals(itemsOtherThanAgentSummary);

    // Set file references
    agentSummary.fileNameReference = 'Agent Summary';
    itemsOtherThanAgentSummary.fileNameReference = supportingFiles.map(f => f.name).join(', ') || undefined;

    // Create rental summary by combining agent summary and items other than agent summary
    const rentalSummary = createEmptySection();

    // Combine income
    rentalSummary.income.grossRentalIncome = agentSummary.income.grossRentalIncome + itemsOtherThanAgentSummary.income.grossRentalIncome;
    rentalSummary.income.waterUsageIncome = agentSummary.income.waterUsageIncome + itemsOtherThanAgentSummary.income.waterUsageIncome;
    rentalSummary.income.otherIncomeReceived = agentSummary.income.otherIncomeReceived + itemsOtherThanAgentSummary.income.otherIncomeReceived;

    // Combine expenses
    Object.keys(rentalSummary.expenses).forEach(key => {
      (rentalSummary.expenses as any)[key] = (agentSummary.expenses as any)[key] + (itemsOtherThanAgentSummary.expenses as any)[key];
    });

    // Calculate totals for rental summary
    calculateSectionTotals(rentalSummary);
    rentalSummary.fileNameReference = agentFiles.map(f => f.name).join(', ') + (supportingFiles.length > 0 ? ', ' + supportingFiles.map(f => f.name).join(', ') : '');

    const totals = combineSections([
      agentSummary,
      itemsOtherThanAgentSummary,
    ]);

    const workingPaper: WorkingPaper = {
      clientName: clientName || 'Not specified',
      propertyAddress: extractedAddress || 'Not specified',
      financialYear: `FY ${financialYear}`,
      datesRented: {
        start: periodStart || `${fyNumber - 1}-07-01`,
        end: periodEnd || `${fyNumber}-06-30`,
      },
      rentalSummary,
      itemsOtherThanAgentSummary,
      agentSummary,
      ...totals,
    };

    // Calculate interest apportionment if we have rental period data
    if (hasInterestData && periodStart && periodEnd) {
      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);
      const daysRented = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      interestSummary.daysRented = daysRented;
      interestSummary.apportionmentFactor = daysRented / 365;
      interestSummary.deductibleInterest = interestSummary.totalInterest * interestSummary.apportionmentFactor;
    }

    // Create depreciation summary
    const depreciationSummary = {
      depreciationMethod: 'diminishing' as const,
      div43Amount: rentalSummary.expenses.capitalWorksDeductions + itemsOtherThanAgentSummary.expenses.capitalWorksDeductions,
      div40Amount: rentalSummary.expenses.capitalAllowanceDeduction + itemsOtherThanAgentSummary.expenses.capitalAllowanceDeduction,
      totalDepreciation: 0
    };
    depreciationSummary.totalDepreciation = depreciationSummary.div43Amount + depreciationSummary.div40Amount;

    // Create property details
    const propertyDetails = {
      address: extractedAddress || 'Not specified',
      isSecondHand: undefined // Will be determined from property lookup
    };

    console.log('Working paper created:', JSON.stringify(workingPaper, null, 2));
    console.log(`Extracted ${allTransactions.length} transactions`);
    console.log(`Failed to process ${failedFiles.length} files:`, failedFiles);
    if (hasInterestData) {
      console.log('Interest summary:', interestSummary);
    }

    const processingTime = Date.now() - startTime;

    const result: ProcessingResult = {
      success: true,
      workingPaper,
      processingTime,
      transactions: allTransactions,
      failedFiles,
      ...(hasInterestData ? { interestSummary } : {}),
      depreciationSummary,
      propertyDetails
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
