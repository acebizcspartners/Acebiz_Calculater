/**
 * ATO Classification Module
 * Classifies rental property expenses according to ATO guidelines
 */

export type ATOClassification = 'immediate_deduction' | 'capital_improvement' | 'initial_repair' | 'needs_review';

export interface ExpenseToClassify {
  description: string;
  amount: number;
  date?: string;
  category: string;
  propertyAcquiredDate?: string;
  isNewProperty?: boolean;
}

export interface ClassificationResult {
  classification: ATOClassification;
  confidence: number; // 0-100
  reasoning: string[];
  atoReference?: string;
  depreciationDetails?: {
    section: 'Division 40' | 'Division 43';
    effectiveLife?: number;
    category?: string;
    method?: 'diminishing' | 'prime';
    annualDepreciation?: number;
  };
}

export interface ClassificationSummary {
  immediateDeductions: number;
  capitalImprovements: number;
  initialRepairs: number;
  needsReview: number;
  totalCapitalAmount: number;
}

/**
 * Keywords that indicate immediate deductions
 */
const IMMEDIATE_DEDUCTION_KEYWORDS = [
  'repair', 'maintenance', 'fix', 'replace worn', 'replace broken',
  'service', 'clean', 'pest control', 'gardening', 'lawn', 'mowing',
  'insurance', 'rates', 'water', 'interest', 'loan',
  'agent fee', 'management fee', 'advertising', 'legal fee',
  'stationery', 'phone', 'postage', 'travel'
];

/**
 * Keywords that indicate capital improvements
 */
const CAPITAL_IMPROVEMENT_KEYWORDS = [
  'renovation', 'extension', 'add', 'new', 'install', 'upgrade',
  'structural', 'replace entire', 'new kitchen', 'new bathroom',
  'deck', 'patio', 'carport', 'garage', 'fence', 'retaining wall',
  'air conditioning', 'heating system', 'solar panel',
  'new roof', 'new flooring', 'new carpet'
];

/**
 * Keywords that indicate initial repairs (before first rental)
 */
const INITIAL_REPAIR_KEYWORDS = [
  'initial', 'before rental', 'pre-rental', 'make rentable',
  'bring up to standard', 'first tenant'
];

/**
 * Immediate deduction categories (always deductible)
 */
const IMMEDIATE_CATEGORIES = [
  'Interest on loans',
  'Council rates',
  'Water rates',
  'Land tax',
  'Insurance',
  'Property agent fees',
  'Advertising for tenants',
  'Gardening/lawn mowing',
  'Pest control',
  'Cleaning',
  'Stationery',
  'Legal fees',
  'Borrowing costs'
];

/**
 * Determine if expense is a capital improvement
 */
function isCapitalImprovement(expense: ExpenseToClassify): { isCapital: boolean; reasons: string[]; confidence: number } {
  const description = expense.description.toLowerCase();
  const category = expense.category.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Check for capital keywords in description
  for (const keyword of CAPITAL_IMPROVEMENT_KEYWORDS) {
    if (description.includes(keyword)) {
      reasons.push(`Description contains "${keyword}" indicating capital work`);
      score += 15;
    }
  }

  // High-value expenses are more likely to be capital
  if (expense.amount > 10000) {
    reasons.push('High expense amount (>$10,000) suggests capital improvement');
    score += 20;
  } else if (expense.amount > 5000) {
    reasons.push('Moderate expense amount (>$5,000) may indicate capital work');
    score += 10;
  }

  // Check category
  if (category.includes('div-43') || category.includes('capital works')) {
    reasons.push('Expense categorized as Division 43 capital works');
    return { isCapital: true, reasons, confidence: 95 };
  }

  if (category.includes('div-40') || category.includes('capital allowance')) {
    reasons.push('Expense categorized as Division 40 plant & equipment');
    return { isCapital: true, reasons, confidence: 95 };
  }

  // Check for replacement vs repair
  if (description.includes('replace entire') || description.includes('new ')) {
    reasons.push('Complete replacement rather than repair');
    score += 20;
  }

  // Structural work is capital
  if (description.includes('structural') || description.includes('extension') || description.includes('add ')) {
    reasons.push('Structural work is capital improvement');
    score += 25;
  }

  const confidence = Math.min(score, 100);
  const isCapital = score >= 50;

  return { isCapital, reasons, confidence };
}

/**
 * Determine if expense is an initial repair
 */
function isInitialRepair(expense: ExpenseToClassify): { isInitial: boolean; reasons: string[]; confidence: number } {
  const description = expense.description.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Check for initial repair keywords
  for (const keyword of INITIAL_REPAIR_KEYWORDS) {
    if (description.includes(keyword)) {
      reasons.push(`Description contains "${keyword}" indicating initial repair`);
      score += 30;
    }
  }

  // Check if expense is before property acquired date
  if (expense.propertyAcquiredDate && expense.date) {
    const expenseDate = new Date(expense.date);
    const acquiredDate = new Date(expense.propertyAcquiredDate);

    if (expenseDate < acquiredDate) {
      reasons.push('Expense occurred before property was acquired');
      score += 40;
    }
  }

  // Check if marked as new property with repairs
  if (expense.isNewProperty === false && description.includes('repair') && description.includes('damage')) {
    reasons.push('Repair of pre-existing damage in acquired property');
    score += 20;
  }

  const confidence = Math.min(score, 100);
  const isInitial = score >= 50;

  return { isInitial, reasons, confidence };
}

/**
 * Get Division 40 depreciation details
 */
function getDiv40Details(description: string, amount: number) {
  const desc = description.toLowerCase();

  // Common depreciable items with effective lives (ATO guidelines)
  const depreciableItems: Record<string, { life: number; category: string }> = {
    'air conditioning': { life: 10, category: 'Mechanical equipment' },
    'dishwasher': { life: 6, category: 'Appliances' },
    'refrigerator': { life: 6, category: 'Appliances' },
    'oven': { life: 8, category: 'Appliances' },
    'cooktop': { life: 8, category: 'Appliances' },
    'hot water': { life: 12, category: 'Plumbing fixtures' },
    'carpet': { life: 8, category: 'Floor coverings' },
    'blinds': { life: 10, category: 'Window furnishings' },
    'curtains': { life: 5, category: 'Window furnishings' },
    'ceiling fan': { life: 10, category: 'Electrical fittings' },
    'light fitting': { life: 5, category: 'Electrical fittings' },
    'security system': { life: 8, category: 'Security equipment' },
    'smoke alarm': { life: 10, category: 'Safety equipment' }
  };

  for (const [item, details] of Object.entries(depreciableItems)) {
    if (desc.includes(item)) {
      // Diminishing value: 200% / effective life
      const rate = 2 / details.life;
      const annualDepreciation = amount * rate;

      return {
        section: 'Division 40' as const,
        effectiveLife: details.life,
        category: details.category,
        method: 'diminishing' as const,
        annualDepreciation
      };
    }
  }

  // Default for unspecified plant & equipment
  return {
    section: 'Division 40' as const,
    effectiveLife: 10,
    category: 'Plant and equipment',
    method: 'diminishing' as const,
    annualDepreciation: amount * 0.2 // 200% / 10 years
  };
}

/**
 * Get Division 43 depreciation details
 */
function getDiv43Details(amount: number) {
  // Division 43 capital works: 2.5% per year over 40 years
  return {
    section: 'Division 43' as const,
    effectiveLife: 40,
    category: 'Capital works',
    method: 'prime' as const,
    annualDepreciation: amount * 0.025
  };
}

/**
 * Classify a single expense
 */
export function classifyExpense(expense: ExpenseToClassify): ClassificationResult {
  const description = expense.description.toLowerCase();
  const category = expense.category;
  const categoryLower = category.toLowerCase();

  // Check if it's already categorized as Division 43 or 40
  if (category.includes('Div-43') || category.includes('Capital works')) {
    return {
      classification: 'capital_improvement',
      confidence: 95,
      reasoning: ['Expense already categorized as Division 43 capital works'],
      atoReference: 'Division 43 - Capital Works',
      depreciationDetails: getDiv43Details(expense.amount)
    };
  }

  if (category.includes('Div-40') || category.includes('Capital allowance')) {
    return {
      classification: 'capital_improvement',
      confidence: 95,
      reasoning: ['Expense already categorized as Division 40 plant & equipment'],
      atoReference: 'Division 40 - Plant and Equipment',
      depreciationDetails: getDiv40Details(description, expense.amount)
    };
  }

  // PRIORITY: Check if category is always an immediate deduction (case-insensitive)
  // These categories are standard expenses that never need review
  const immediateMatch = IMMEDIATE_CATEGORIES.find(cat =>
    categoryLower.includes(cat.toLowerCase())
  );

  if (immediateMatch) {
    return {
      classification: 'immediate_deduction',
      confidence: 95,
      reasoning: [`Category "${category}" is a standard immediate deduction`],
      atoReference: 'Section 8-1 ITAA 1997 - General deductions'
    };
  }

  // Check for initial repairs
  const initialCheck = isInitialRepair(expense);
  if (initialCheck.isInitial) {
    return {
      classification: 'initial_repair',
      confidence: initialCheck.confidence,
      reasoning: initialCheck.reasons,
      atoReference: 'TR 97/23 - Initial repairs not deductible'
    };
  }

  // Check for capital improvements
  const capitalCheck = isCapitalImprovement(expense);
  if (capitalCheck.isCapital) {
    // Determine if Div 40 or Div 43
    const isPlantEquipment =
      description.includes('appliance') ||
      description.includes('air con') ||
      description.includes('carpet') ||
      description.includes('blinds') ||
      description.includes('hot water');

    if (isPlantEquipment) {
      return {
        classification: 'capital_improvement',
        confidence: capitalCheck.confidence,
        reasoning: [...capitalCheck.reasons, 'Classified as Division 40 plant & equipment'],
        atoReference: 'Division 40 - Plant and Equipment',
        depreciationDetails: getDiv40Details(description, expense.amount)
      };
    } else {
      return {
        classification: 'capital_improvement',
        confidence: capitalCheck.confidence,
        reasoning: [...capitalCheck.reasons, 'Classified as Division 43 capital works'],
        atoReference: 'Division 43 - Capital Works',
        depreciationDetails: getDiv43Details(expense.amount)
      };
    }
  }

  // Check for immediate deduction keywords
  const hasImmediateKeywords = IMMEDIATE_DEDUCTION_KEYWORDS.some(kw => description.includes(kw));
  if (hasImmediateKeywords) {
    return {
      classification: 'immediate_deduction',
      confidence: 75,
      reasoning: ['Expense appears to be routine maintenance or repair'],
      atoReference: 'Section 8-1 ITAA 1997 - General deductions'
    };
  }

  // Repairs & Maintenance category - apply intelligent thresholds
  if (categoryLower.includes('repair') || categoryLower.includes('maintenance')) {
    // Small repairs are always immediate deductions
    if (expense.amount < 2500) {
      return {
        classification: 'immediate_deduction',
        confidence: 85,
        reasoning: ['Routine repair/maintenance amount', 'Generally immediate deduction'],
        atoReference: 'Section 8-1 ITAA 1997 - General deductions'
      };
    }
    // Medium repairs ($2,500-$10,000) - check description for capital improvement indicators
    else if (expense.amount < 10000) {
      // If description suggests routine maintenance, allow as immediate deduction
      if (description.includes('fix') || description.includes('service') ||
          description.includes('clean') || description.includes('replace broken')) {
        return {
          classification: 'immediate_deduction',
          confidence: 75,
          reasoning: ['Repair appears to be routine maintenance', 'Restoring to original condition'],
          atoReference: 'Section 8-1 ITAA 1997 - General deductions'
        };
      }
      // Otherwise flag for review
      return {
        classification: 'needs_review',
        confidence: 60,
        reasoning: [
          'Repair amount warrants review',
          'Determine if repair or improvement',
          'Check if it extends useful life or improves beyond original condition'
        ],
        atoReference: 'TR 97/23 - Repairs vs Improvements'
      };
    }
    // Large repairs (>$10,000) always need review
    else {
      return {
        classification: 'needs_review',
        confidence: 70,
        reasoning: [
          'Large repair/maintenance amount',
          'Likely capital improvement requiring depreciation',
          'Review for Division 40 or 43 treatment'
        ],
        atoReference: 'TR 97/23 - Repairs vs Improvements'
      };
    }
  }

  // Default: needs review
  return {
    classification: 'needs_review',
    confidence: 50,
    reasoning: [
      'Unable to automatically classify',
      'Manual review recommended',
      'Consider: timing, nature of work, and effect on property'
    ],
    atoReference: 'Manual review required'
  };
}

/**
 * Classify multiple expenses
 */
export function classifyExpenses(expenses: ExpenseToClassify[]): {
  classifications: ClassificationResult[];
  summary: ClassificationSummary;
} {
  const classifications = expenses.map(expense => classifyExpense(expense));

  const summary: ClassificationSummary = {
    immediateDeductions: 0,
    capitalImprovements: 0,
    initialRepairs: 0,
    needsReview: 0,
    totalCapitalAmount: 0
  };

  classifications.forEach((result, index) => {
    const amount = expenses[index].amount;

    switch (result.classification) {
      case 'immediate_deduction':
        summary.immediateDeductions++;
        break;
      case 'capital_improvement':
        summary.capitalImprovements++;
        summary.totalCapitalAmount += amount;
        break;
      case 'initial_repair':
        summary.initialRepairs++;
        break;
      case 'needs_review':
        summary.needsReview++;
        break;
    }
  });

  return { classifications, summary };
}
