import { Transaction } from '@/types/workingPaper';

/**
 * Duplicate Detection Module
 * Identifies potential duplicate transactions across agent statements and supporting documents
 */

interface DuplicateMatch {
  transaction1: Transaction;
  transaction2: Transaction;
  confidence: number;
  reasons: string[];
}

interface DuplicateStats {
  totalTransactions: number;
  uniqueTransactions: number;
  possibleDuplicates: number;
  confirmedDuplicates: number;
  potentialSavings: number;
}

/**
 * Calculate similarity score between two amounts
 * Returns 1.0 for exact match, decreasing as difference increases
 */
function amountSimilarity(amount1: number, amount2: number): number {
  if (amount1 === amount2) return 1.0;

  const diff = Math.abs(amount1 - amount2);
  const avg = (amount1 + amount2) / 2;
  const percentDiff = diff / avg;

  // Consider amounts within 1% as highly similar (0.9)
  // Within 5% as moderately similar (0.7)
  // Greater than 5% as not similar (< 0.5)
  if (percentDiff < 0.01) return 0.95;
  if (percentDiff < 0.05) return 0.7;
  return Math.max(0, 1 - percentDiff);
}

/**
 * Calculate text similarity using simple token matching
 */
function textSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) =>
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2); // Ignore short words

  const tokens1 = normalize(text1);
  const tokens2 = normalize(text2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Calculate date proximity score
 * Returns 1.0 for same date, decreasing with days apart
 */
function dateSimilarity(date1: string, date2: string): number {
  if (!date1 || !date2) return 0;

  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

    const daysDiff = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 1.0;
    if (daysDiff <= 7) return 0.8; // Within a week
    if (daysDiff <= 30) return 0.5; // Within a month
    return 0.2; // More than a month apart
  } catch {
    return 0;
  }
}

/**
 * Analyze two transactions to determine if they might be duplicates
 */
function analyzeDuplicatePair(tx1: Transaction, tx2: Transaction): DuplicateMatch | null {
  // Don't compare a transaction with itself
  if (tx1.id === tx2.id) return null;

  // Must be same type (both income or both expense)
  if (tx1.type !== tx2.type) return null;

  const reasons: string[] = [];
  let totalScore = 0;
  let weights = 0;

  // Amount similarity (weight: 40%)
  const amountScore = amountSimilarity(tx1.amount, tx2.amount);
  totalScore += amountScore * 0.4;
  weights += 0.4;

  if (amountScore > 0.95) {
    reasons.push('Exact amount match');
  } else if (amountScore > 0.7) {
    reasons.push('Very similar amounts');
  }

  // Description similarity (weight: 30%)
  const descScore = textSimilarity(tx1.description, tx2.description);
  totalScore += descScore * 0.3;
  weights += 0.3;

  if (descScore > 0.7) {
    reasons.push('Similar descriptions');
  }

  // Date proximity (weight: 20%)
  const dateScore = dateSimilarity(tx1.date, tx2.date);
  totalScore += dateScore * 0.2;
  weights += 0.2;

  if (dateScore > 0.8) {
    reasons.push('Dates very close or identical');
  } else if (dateScore > 0.5) {
    reasons.push('Dates within same period');
  }

  // Category match (weight: 10%)
  if (tx1.category && tx2.category && tx1.category === tx2.category) {
    totalScore += 0.1;
    weights += 0.1;
    reasons.push('Same category');
  }

  // Different source files increases duplicate likelihood
  if (tx1.sourceFile !== tx2.sourceFile) {
    totalScore += 0.1; // Bonus for cross-file duplicates
    reasons.push('Appears in different files');
  }

  const confidence = (totalScore / Math.max(weights, 1)) * 100;

  // Only return matches above 60% confidence
  if (confidence >= 60) {
    return {
      transaction1: tx1,
      transaction2: tx2,
      confidence,
      reasons
    };
  }

  return null;
}

/**
 * Find all duplicate transactions
 */
export function findDuplicates(transactions: Transaction[]): {
  transactionsWithStatus: Transaction[];
  duplicates: DuplicateMatch[];
} {
  const duplicates: DuplicateMatch[] = [];
  const duplicateGroups: Map<string, Set<string>> = new Map();

  // Compare all pairs of transactions
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const match = analyzeDuplicatePair(transactions[i], transactions[j]);

      if (match) {
        duplicates.push(match);

        // Track duplicate groups
        const id1 = transactions[i].id || `tx_${i}`;
        const id2 = transactions[j].id || `tx_${j}`;

        // Find or create group
        let groupId: string | undefined;
        for (const [gid, group] of duplicateGroups.entries()) {
          if (group.has(id1) || group.has(id2)) {
            groupId = gid;
            group.add(id1);
            group.add(id2);
            break;
          }
        }

        if (!groupId) {
          groupId = `group_${id1}`;
          duplicateGroups.set(groupId, new Set([id1, id2]));
        }
      }
    }
  }

  // Enhance transactions with duplicate status
  const transactionsWithStatus = transactions.map((tx, index) => {
    const txId = tx.id || `tx_${index}`;

    // Find if this transaction is in any duplicate group
    let groupId: string | undefined;
    let matchCount = 0;
    let maxConfidence = 0;
    const allReasons: Set<string> = new Set();

    for (const [gid, group] of duplicateGroups.entries()) {
      if (group.has(txId)) {
        groupId = gid;
        matchCount = group.size - 1; // Exclude itself

        // Find max confidence and collect reasons
        duplicates.forEach(dup => {
          const dup1Id = dup.transaction1.id;
          const dup2Id = dup.transaction2.id;

          if (dup1Id === txId || dup2Id === txId) {
            maxConfidence = Math.max(maxConfidence, dup.confidence);
            dup.reasons.forEach(r => allReasons.add(r));
          }
        });

        break;
      }
    }

    if (groupId) {
      const status = maxConfidence >= 85 ? 'confirmed_duplicate' : 'possible_duplicate';

      // For duplicates, keep the first one in the group, exclude others
      const groupMembers = Array.from(duplicateGroups.get(groupId) || []);
      const isFirstInGroup = groupMembers[0] === txId;

      return {
        ...tx,
        duplicateStatus: status,
        duplicateGroup: groupId,
        duplicateConfidence: Math.round(maxConfidence),
        duplicateReasons: Array.from(allReasons),
        includeInTotal: isFirstInGroup // Only include first transaction in group
      };
    }

    return {
      ...tx,
      duplicateStatus: 'unique' as const,
      includeInTotal: true
    };
  });

  return {
    transactionsWithStatus,
    duplicates
  };
}

/**
 * Get statistics about duplicate detection results
 */
export function getDuplicateStats(transactionsWithStatus: Transaction[]): DuplicateStats {
  let totalTransactions = transactionsWithStatus.length;
  let uniqueTransactions = 0;
  let possibleDuplicates = 0;
  let confirmedDuplicates = 0;
  let potentialSavings = 0;

  transactionsWithStatus.forEach(tx => {
    if (tx.duplicateStatus === 'unique') {
      uniqueTransactions++;
    } else if (tx.duplicateStatus === 'possible_duplicate') {
      possibleDuplicates++;
      if (!tx.includeInTotal) {
        potentialSavings += tx.amount;
      }
    } else if (tx.duplicateStatus === 'confirmed_duplicate') {
      confirmedDuplicates++;
      if (!tx.includeInTotal) {
        potentialSavings += tx.amount;
      }
    }
  });

  return {
    totalTransactions,
    uniqueTransactions,
    possibleDuplicates,
    confirmedDuplicates,
    potentialSavings
  };
}
