import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { WorkingPaper, InterestSummary, DepreciationSummary, PropertyDetails, Transaction } from '@/types/workingPaper';

function createTransactionListSheet(workingPaper: WorkingPaper, transactions: Transaction[]) {
  const data: any[][] = [];

  // Header
  data.push(['Client Name:', workingPaper.clientName]);
  data.push(['Property Address:', workingPaper.propertyAddress]);
  data.push(['Financial Year:', workingPaper.financialYear]);
  data.push([]);

  // Column headers
  data.push([
    'Date',
    'Amount',
    'Nature of Expense/Income',
    'Section',
    'Category',
    'Source File Name',
    'Duplicate Status',
    'ATO Classification'
  ]);

  // Add transactions with enhanced fields
  transactions.forEach(tx => {
    data.push([
      tx.date || '',
      tx.amount || 0,
      tx.description || '',
      tx.section || 'Agent Summary',
      tx.category || '',
      tx.sourceFile || '',
      tx.duplicateStatus || 'unique',
      tx.atoClassification || ''
    ]);
  });

  return data;
}

function createDuplicatesSheet(transactions: Transaction[]) {
  const data: any[][] = [];

  // Header
  data.push(['DUPLICATE EXPENSE ANALYSIS']);
  data.push([]);
  data.push(['This sheet identifies potential duplicate expenses that may be double-counted']);
  data.push([]);

  // Statistics
  const stats = {
    total: transactions.length,
    unique: transactions.filter(tx => tx.duplicateStatus === 'unique').length,
    possible: transactions.filter(tx => tx.duplicateStatus === 'possible_duplicate').length,
    confirmed: transactions.filter(tx => tx.duplicateStatus === 'confirmed_duplicate').length,
    totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
    includedAmount: transactions.filter(tx => tx.includeInTotal !== false).reduce((sum, tx) => sum + tx.amount, 0)
  };

  data.push(['Summary Statistics']);
  data.push(['Total Transactions:', stats.total]);
  data.push(['Unique Transactions:', stats.unique]);
  data.push(['Possible Duplicates:', stats.possible]);
  data.push(['Confirmed Duplicates:', stats.confirmed]);
  data.push(['Total Amount (All):', `$${stats.totalAmount.toFixed(2)}`]);
  data.push(['Amount After Deduplication:', `$${stats.includedAmount.toFixed(2)}`]);
  data.push(['Potential Savings:', `$${(stats.totalAmount - stats.includedAmount).toFixed(2)}`]);
  data.push([]);

  // Duplicate groups
  data.push(['Duplicate Groups']);
  data.push(['Group', 'Date', 'Description', 'Amount', 'Source', 'Confidence', 'Status', 'Include in Total']);

  // Group duplicates
  const groups: Record<string, Transaction[]> = {};
  transactions.forEach(tx => {
    if (tx.duplicateStatus !== 'unique') {
      const groupKey = tx.duplicateGroup || tx.id || 'ungrouped';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(tx);
    }
  });

  Object.entries(groups).forEach(([groupKey, groupTxs]) => {
    groupTxs.forEach((tx, idx) => {
      data.push([
        idx === 0 ? groupKey : '',
        tx.date,
        tx.description,
        tx.amount,
        tx.sourceFile,
        `${tx.duplicateConfidence || 0}%`,
        tx.duplicateStatus,
        tx.includeInTotal === false ? 'No' : 'Yes'
      ]);
    });
    data.push([]); // Empty row between groups
  });

  return data;
}

function createCapitalItemsSheet(transactions: Transaction[]) {
  const data: any[][] = [];

  // Header
  data.push(['CAPITAL ITEMS WORKING PAPER']);
  data.push([]);
  data.push(['ATO Guidelines: Capital improvements must be depreciated over their effective life']);
  data.push([]);

  // Filter capital items
  const capitalItems = transactions.filter(tx =>
    tx.atoClassification === 'capital_improvement' && tx.type === 'expense'
  );

  if (capitalItems.length === 0) {
    data.push(['No capital items identified']);
    return data;
  }

  // Separate by division
  const div40Items = capitalItems.filter(tx =>
    tx.depreciationDetails?.section === 'Division 40'
  );
  const div43Items = capitalItems.filter(tx =>
    tx.depreciationDetails?.section === 'Division 43'
  );
  const unclassified = capitalItems.filter(tx =>
    !tx.depreciationDetails?.section
  );

  // Division 40 - Plant & Equipment
  if (div40Items.length > 0) {
    data.push(['DIVISION 40 - PLANT & EQUIPMENT']);
    data.push(['Date', 'Description', 'Amount', 'Effective Life', 'Method', 'Annual Depreciation', 'Confidence']);

    div40Items.forEach(tx => {
      data.push([
        tx.date,
        tx.description,
        tx.amount,
        tx.depreciationDetails?.effectiveLife ? `${tx.depreciationDetails.effectiveLife} years` : 'TBD',
        tx.depreciationDetails?.method || 'diminishing',
        tx.depreciationDetails?.annualDepreciation || (tx.amount / (tx.depreciationDetails?.effectiveLife || 10)),
        `${tx.atoClassificationConfidence || 0}%`
      ]);
    });

    const div40Total = div40Items.reduce((sum, tx) => sum + tx.amount, 0);
    data.push(['', 'Total Division 40:', div40Total]);
    data.push([]);
  }

  // Division 43 - Capital Works
  if (div43Items.length > 0) {
    data.push(['DIVISION 43 - CAPITAL WORKS']);
    data.push(['Date', 'Description', 'Amount', 'Deduction Rate', 'Annual Deduction', 'Confidence']);

    div43Items.forEach(tx => {
      data.push([
        tx.date,
        tx.description,
        tx.amount,
        '2.5% per annum',
        tx.amount * 0.025,
        `${tx.atoClassificationConfidence || 0}%`
      ]);
    });

    const div43Total = div43Items.reduce((sum, tx) => sum + tx.amount, 0);
    data.push(['', 'Total Division 43:', div43Total]);
    data.push([]);
  }

  // Unclassified capital items
  if (unclassified.length > 0) {
    data.push(['UNCLASSIFIED CAPITAL ITEMS (Need Review)']);
    data.push(['Date', 'Description', 'Amount', 'Confidence', 'Reasons']);

    unclassified.forEach(tx => {
      data.push([
        tx.date,
        tx.description,
        tx.amount,
        `${tx.atoClassificationConfidence || 0}%`,
        tx.atoClassificationReasons?.join('; ') || ''
      ]);
    });
    data.push([]);
  }

  // Summary
  const totalCapital = capitalItems.reduce((sum, tx) => sum + tx.amount, 0);
  data.push(['CAPITAL ITEMS SUMMARY']);
  data.push(['Total Capital Expenditure:', totalCapital]);
  data.push(['Division 40 Total:', div40Items.reduce((sum, tx) => sum + tx.amount, 0)]);
  data.push(['Division 43 Total:', div43Items.reduce((sum, tx) => sum + tx.amount, 0)]);
  data.push(['Unclassified Total:', unclassified.reduce((sum, tx) => sum + tx.amount, 0)]);

  return data;
}

function createATOClassificationSheet(transactions: Transaction[]) {
  const data: any[][] = [];

  // Header
  data.push(['ATO EXPENSE CLASSIFICATION']);
  data.push([]);
  data.push(['Classification of expenses per ATO guidelines']);
  data.push([]);

  // Filter expense transactions
  const expenses = transactions.filter(tx => tx.type === 'expense');

  // Statistics
  const stats = {
    immediateDeduction: expenses.filter(tx => tx.atoClassification === 'immediate_deduction').length,
    capitalImprovement: expenses.filter(tx => tx.atoClassification === 'capital_improvement').length,
    initialRepair: expenses.filter(tx => tx.atoClassification === 'initial_repair').length,
    needsReview: expenses.filter(tx => tx.atoClassification === 'needs_review').length ||
                  expenses.filter(tx => !tx.atoClassification).length
  };

  data.push(['Classification Summary']);
  data.push(['Immediate Deductions:', stats.immediateDeduction]);
  data.push(['Capital Improvements:', stats.capitalImprovement]);
  data.push(['Initial Repairs (Non-deductible):', stats.initialRepair]);
  data.push(['Needs Review:', stats.needsReview]);
  data.push([]);

  // Detailed list
  data.push(['Classification Details']);
  data.push(['Date', 'Description', 'Amount', 'Category', 'Classification', 'Confidence', 'Reasons']);

  expenses.forEach(tx => {
    data.push([
      tx.date,
      tx.description,
      tx.amount,
      tx.category,
      tx.atoClassification || 'unclassified',
      tx.atoClassificationConfidence ? `${tx.atoClassificationConfidence}%` : '',
      tx.atoClassificationReasons?.join('; ') || ''
    ]);
  });

  return data;
}

function createUnprocessedFilesSheet(failedFiles: string[]) {
  const data: any[][] = [];

  data.push(['Unprocessed Files']);
  data.push(['The following files could not be processed:']);
  data.push([]);
  data.push(['File Name', 'Status']);

  failedFiles.forEach(fileName => {
    data.push([fileName, 'Failed to extract data']);
  });

  return data;
}

function createInterestSummarySheet(interestSummary: InterestSummary, propertyDetails: PropertyDetails) {
  const data: any[][] = [];

  data.push(['INTEREST DEDUCTION CALCULATION']);
  data.push([]);
  data.push(['Property Address:', propertyDetails.address]);
  data.push([]);

  data.push(['Loan Details']);
  data.push(['Lender:', interestSummary.lender || 'Not specified']);
  data.push(['Loan Account:', interestSummary.loanAccount || 'Not specified']);
  data.push(['Loan Amount:', interestSummary.loanAmount || 0]);
  data.push([]);

  data.push(['Interest Calculation']);
  data.push(['Annual Interest Paid:', interestSummary.totalInterest || 0]);
  data.push(['Days Rented:', interestSummary.daysRented || 0]);
  data.push(['Days Total:', interestSummary.daysTotal || 365]);
  data.push(['Apportionment Factor:', `${((interestSummary.apportionmentFactor || 0) * 100).toFixed(2)}%`]);
  data.push([]);

  data.push(['Deductible Interest:', interestSummary.deductibleInterest || 0]);

  return data;
}

function createDepreciationSheet(depreciationSummary: DepreciationSummary, propertyDetails: PropertyDetails) {
  const data: any[][] = [];

  data.push(['DEPRECIATION SUMMARY']);
  data.push([]);
  data.push(['Property:', propertyDetails.address]);
  data.push(['Property Type:', propertyDetails.isSecondHand === false ? 'New Property' : 'Second Hand Property']);
  data.push([]);

  data.push(['Depreciation Method:', 'Diminishing Value']);
  data.push([]);

  data.push(['Capital Works (Division 43)']);
  data.push(['Amount:', depreciationSummary.div43Amount || 0]);
  data.push([]);

  data.push(['Plant & Equipment (Division 40)']);
  data.push(['Amount:', depreciationSummary.div40Amount || 0]);
  if (propertyDetails.isSecondHand) {
    data.push(['Note:', 'Capital allowances not claimable for second-hand property']);
  }
  data.push([]);

  data.push(['Total Depreciation:', depreciationSummary.totalDepreciation || 0]);

  return data;
}

function createCouncilRatesSheet(transactions: any[]) {
  const data: any[][] = [];
  const councilTransactions = transactions.filter(tx =>
    tx.category?.toLowerCase().includes('council') && tx.councilRatesDetail
  );

  data.push(['COUNCIL RATES BREAKDOWN']);
  data.push([]);
  data.push(['Quarter', 'Due Date', 'Amount']);

  councilTransactions.forEach(tx => {
    if (tx.councilRatesDetail?.quarters) {
      tx.councilRatesDetail.quarters.forEach((q: any) => {
        data.push([q.quarter, q.dueDate, q.amount]);
      });
    }
  });

  const total = councilTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  data.push([]);
  data.push(['Total Annual Council Rates:', '', total]);

  return data;
}

function createInsuranceSheet(transactions: any[]) {
  const data: any[][] = [];
  const insuranceTransactions = transactions.filter(tx =>
    tx.category?.toLowerCase().includes('insurance') && tx.insuranceDetail
  );

  data.push(['INSURANCE APPORTIONMENT']);
  data.push([]);
  data.push(['Policy', 'Period Start', 'Period End', 'Annual Premium', 'Apportioned Amount']);

  insuranceTransactions.forEach(tx => {
    if (tx.insuranceDetail) {
      data.push([
        tx.description,
        tx.insuranceDetail.policyPeriodStart,
        tx.insuranceDetail.policyPeriodEnd,
        tx.insuranceDetail.annualPremium,
        tx.insuranceDetail.apportionedAmount
      ]);
    }
  });

  const total = insuranceTransactions.reduce((sum, tx) =>
    sum + (tx.insuranceDetail?.apportionedAmount || tx.amount || 0), 0
  );
  data.push([]);
  data.push(['Total Insurance (Tax Year):', '', '', '', total]);

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workingPaper: WorkingPaper = body.workingPaper;
    const transactions: Transaction[] = body.transactions || [];
    const failedFiles: string[] = body.failedFiles || [];
    const interestSummary: InterestSummary = body.interestSummary;
    const depreciationSummary: DepreciationSummary = body.depreciationSummary;
    const propertyDetails: PropertyDetails = body.propertyDetails;

    if (!workingPaper) {
      return NextResponse.json(
        { success: false, error: 'Working paper data is required' },
        { status: 400 }
      );
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create Transaction List sheet
    const transactionData = createTransactionListSheet(workingPaper, transactions);
    const wsTransactions = XLSX.utils.aoa_to_sheet(transactionData);
    wsTransactions['!cols'] = [
      { wch: 12 },  // Date
      { wch: 12 },  // Amount
      { wch: 40 },  // Nature/Description
      { wch: 35 },  // Section
      { wch: 30 },  // Category
      { wch: 40 },  // Source File
    ];
    XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transaction List');

    // Create Unprocessed Files sheet if there are failed files
    if (failedFiles.length > 0) {
      const failedData = createUnprocessedFilesSheet(failedFiles);
      const wsFailed = XLSX.utils.aoa_to_sheet(failedData);
      wsFailed['!cols'] = [
        { wch: 50 },  // File Name
        { wch: 25 },  // Status
      ];
      XLSX.utils.book_append_sheet(wb, wsFailed, 'Unprocessed Files');
    }

    // Create Interest Summary sheet if interest data exists
    if (interestSummary && interestSummary.totalInterest > 0) {
      const interestData = createInterestSummarySheet(
        interestSummary,
        propertyDetails || { address: workingPaper.propertyAddress || 'Not specified' }
      );
      const wsInterest = XLSX.utils.aoa_to_sheet(interestData);
      wsInterest['!cols'] = [
        { wch: 30 },  // Label
        { wch: 40 },  // Value
      ];
      XLSX.utils.book_append_sheet(wb, wsInterest, 'Interest Summary');
    }

    // Create Depreciation sheet
    if (depreciationSummary && (depreciationSummary.totalDepreciation ?? 0) > 0) {
      const depreciationData = createDepreciationSheet(
        depreciationSummary,
        propertyDetails || { address: workingPaper.propertyAddress || 'Not specified' }
      );
      const wsDepreciation = XLSX.utils.aoa_to_sheet(depreciationData);
      wsDepreciation['!cols'] = [
        { wch: 30 },  // Label
        { wch: 20 },  // Value
      ];
      XLSX.utils.book_append_sheet(wb, wsDepreciation, 'Depreciation');
    }

    // Create Council Rates sheet if quarterly data exists
    const hasCouncilQuarters = transactions.some(tx =>
      tx.category?.toLowerCase().includes('council') && tx.councilRatesDetail?.quarters
    );
    if (hasCouncilQuarters) {
      const councilData = createCouncilRatesSheet(transactions);
      const wsCouncil = XLSX.utils.aoa_to_sheet(councilData);
      wsCouncil['!cols'] = [
        { wch: 15 },  // Quarter
        { wch: 15 },  // Due Date
        { wch: 15 },  // Amount
      ];
      XLSX.utils.book_append_sheet(wb, wsCouncil, 'Council Rates');
    }

    // Create Insurance sheet if apportionment data exists
    const hasInsuranceApportionment = transactions.some(tx =>
      tx.category?.toLowerCase().includes('insurance') && tx.insuranceDetail
    );
    if (hasInsuranceApportionment) {
      const insuranceData = createInsuranceSheet(transactions);
      const wsInsurance = XLSX.utils.aoa_to_sheet(insuranceData);
      wsInsurance['!cols'] = [
        { wch: 30 },  // Policy
        { wch: 15 },  // Start
        { wch: 15 },  // End
        { wch: 15 },  // Annual
        { wch: 20 },  // Apportioned
      ];
      XLSX.utils.book_append_sheet(wb, wsInsurance, 'Insurance');
    }

    // Create Duplicates sheet if duplicates exist
    const hasDuplicates = transactions.some(tx => tx.duplicateStatus && tx.duplicateStatus !== 'unique');
    if (hasDuplicates) {
      const duplicatesData = createDuplicatesSheet(transactions);
      const wsDuplicates = XLSX.utils.aoa_to_sheet(duplicatesData);
      wsDuplicates['!cols'] = [
        { wch: 15 },  // Group
        { wch: 12 },  // Date
        { wch: 40 },  // Description
        { wch: 12 },  // Amount
        { wch: 30 },  // Source
        { wch: 12 },  // Confidence
        { wch: 20 },  // Status
        { wch: 15 },  // Include
      ];
      XLSX.utils.book_append_sheet(wb, wsDuplicates, 'Duplicate Analysis');
    }

    // Create Capital Items sheet if capital items exist
    const hasCapitalItems = transactions.some(tx => tx.atoClassification === 'capital_improvement');
    if (hasCapitalItems) {
      const capitalData = createCapitalItemsSheet(transactions);
      const wsCapital = XLSX.utils.aoa_to_sheet(capitalData);
      wsCapital['!cols'] = [
        { wch: 12 },  // Date
        { wch: 50 },  // Description
        { wch: 12 },  // Amount
        { wch: 15 },  // Effective Life/Rate
        { wch: 15 },  // Method/Annual
        { wch: 20 },  // Depreciation/Confidence
        { wch: 40 },  // Reasons
      ];
      XLSX.utils.book_append_sheet(wb, wsCapital, 'Capital Items');
    }

    // Create ATO Classification sheet
    if (transactions.length > 0) {
      const classificationData = createATOClassificationSheet(transactions);
      const wsClassification = XLSX.utils.aoa_to_sheet(classificationData);
      wsClassification['!cols'] = [
        { wch: 12 },  // Date
        { wch: 40 },  // Description
        { wch: 12 },  // Amount
        { wch: 25 },  // Category
        { wch: 20 },  // Classification
        { wch: 12 },  // Confidence
        { wch: 50 },  // Reasons
      ];
      XLSX.utils.book_append_sheet(wb, wsClassification, 'ATO Classification');
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as downloadable file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Rental_Transactions_${workingPaper.clientName.replace(/\s+/g, '_')}_${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate Excel file',
      },
      { status: 500 }
    );
  }
}
