'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProcessingResult, WorkingPaper, RentalSection, Transaction } from '@/types/workingPaper';

// Transaction List Component with Duplicate Highlighting
function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState<'all' | 'unique' | 'duplicates'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'unique') return tx.duplicateStatus === 'unique';
    if (filter === 'duplicates') return tx.duplicateStatus !== 'unique';
    return true;
  });

  // Group duplicates together
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const groupKey = tx.duplicateGroup || tx.id || 'ungrouped';
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Calculate statistics
  const stats = {
    total: transactions.length,
    unique: transactions.filter(tx => tx.duplicateStatus === 'unique').length,
    possible: transactions.filter(tx => tx.duplicateStatus === 'possible_duplicate').length,
    confirmed: transactions.filter(tx => tx.duplicateStatus === 'confirmed_duplicate').length,
    totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
    includedAmount: transactions.filter(tx => tx.includeInTotal !== false).reduce((sum, tx) => sum + tx.amount, 0),
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('unique')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'unique'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Unique ({stats.unique})
          </button>
          <button
            onClick={() => setFilter('duplicates')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'duplicates'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Duplicates ({stats.possible + stats.confirmed})
          </button>
        </div>
      </div>

      {/* Duplicate Summary Alert */}
      {(stats.possible > 0 || stats.confirmed > 0) && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">Duplicate Expenses Detected</h4>
              <p className="mt-1 text-sm text-yellow-700">
                Found {stats.confirmed} confirmed and {stats.possible} possible duplicates.
                Potential double-counting: ${(stats.totalAmount - stats.includedAmount).toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-yellow-600">
                Common duplicates: Water rates, council rates, and strata fees appearing in both agent summaries and direct bills.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Classification</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(groupedTransactions).map(([groupKey, groupTxs]) => {
              const isExpanded = expandedGroups.has(groupKey);
              const hasDuplicates = groupTxs.length > 1 || groupTxs[0]?.duplicateStatus !== 'unique';

              return groupTxs.map((tx, idx) => {
                const isFirstInGroup = idx === 0;
                const showRow = !hasDuplicates || isExpanded || isFirstInGroup;

                if (!showRow) return null;

                // Determine row background based on duplicate status
                let rowClass = '';
                if (tx.duplicateStatus === 'confirmed_duplicate') {
                  rowClass = tx.includeInTotal === false ? 'bg-red-50' : 'bg-yellow-50';
                } else if (tx.duplicateStatus === 'possible_duplicate') {
                  rowClass = 'bg-yellow-50';
                }

                // Determine ATO classification color
                let classificationColor = 'text-gray-600';
                let classificationBg = 'bg-gray-100';
                if (tx.atoClassification === 'immediate_deduction') {
                  classificationColor = 'text-green-700';
                  classificationBg = 'bg-green-100';
                } else if (tx.atoClassification === 'capital_improvement') {
                  classificationColor = 'text-orange-700';
                  classificationBg = 'bg-orange-100';
                } else if (tx.atoClassification === 'initial_repair') {
                  classificationColor = 'text-red-700';
                  classificationBg = 'bg-red-100';
                } else if (tx.atoClassification === 'needs_review') {
                  classificationColor = 'text-blue-700';
                  classificationBg = 'bg-blue-100';
                }

                return (
                  <tr key={tx.id} className={`${rowClass} hover:bg-gray-50`}>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {hasDuplicates && isFirstInGroup && (
                        <button
                          onClick={() => toggleGroup(groupKey)}
                          className="mr-1 text-gray-500 hover:text-gray-700"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      )}
                      {!isFirstInGroup && <span className="ml-4"></span>}
                      {tx.date}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">{tx.description}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{tx.category}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                      ${tx.amount.toFixed(2)}
                      {tx.includeInTotal === false && (
                        <span className="ml-1 text-xs text-red-600">(excluded)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      <span className="truncate block max-w-xs" title={tx.sourceFile}>
                        {tx.sourceFile}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {tx.duplicateStatus === 'confirmed_duplicate' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Duplicate {tx.duplicateConfidence}%
                        </span>
                      )}
                      {tx.duplicateStatus === 'possible_duplicate' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Possible {tx.duplicateConfidence}%
                        </span>
                      )}
                      {tx.duplicateStatus === 'unique' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Unique
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {tx.type === 'expense' && tx.atoClassification && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classificationBg} ${classificationColor}`}>
                          {tx.atoClassification === 'immediate_deduction' && 'Deductible'}
                          {tx.atoClassification === 'capital_improvement' && 'Capital'}
                          {tx.atoClassification === 'initial_repair' && 'Initial Repair'}
                          {tx.atoClassification === 'needs_review' && 'Review'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Section Card Component (kept from original)
function SectionCard({
  title,
  subtitle,
  section,
  color
}: {
  title: string;
  subtitle?: string;
  section: RentalSection;
  color: 'blue' | 'green' | 'purple';
}) {
  const bgColors = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200'
  };

  const headerColors = {
    blue: 'bg-blue-100 text-blue-900',
    green: 'bg-green-100 text-green-900',
    purple: 'bg-purple-100 text-purple-900'
  };

  const totalColors = {
    blue: 'text-blue-900 bg-blue-100',
    green: 'text-green-900 bg-green-100',
    purple: 'text-purple-900 bg-purple-100'
  };

  return (
    <div className={`rounded-lg border-2 ${bgColors[color]} overflow-hidden`}>
      <div className={`px-4 py-3 ${headerColors[color]}`}>
        <h4 className="font-semibold">{title}</h4>
        {subtitle && <p className="text-sm opacity-80">{subtitle}</p>}
      </div>

      <div className="p-4 space-y-3">
        {/* Income Section */}
        <div>
          <h5 className="font-semibold text-gray-700 text-sm mb-2">Income</h5>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Gross Rental Income</span>
              <span className="font-medium">${section.income.grossRentalIncome.toFixed(2)}</span>
            </div>
            {section.income.waterUsageIncome > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Water Usage Income</span>
                <span className="font-medium">${section.income.waterUsageIncome.toFixed(2)}</span>
              </div>
            )}
            {section.income.otherIncomeReceived > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Other Income</span>
                <span className="font-medium">${section.income.otherIncomeReceived.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expense Section */}
        <div>
          <h5 className="font-semibold text-gray-700 text-sm mb-2">Expenses</h5>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {Object.entries(section.expenses).map(([key, value]) => {
              if (value === 0) return null;
              const label = key.replace(/([A-Z])/g, ' $1').trim()
                .replace(/^./, str => str.toUpperCase());
              return (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium">${value.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className={`pt-3 mt-3 border-t-2 border-gray-200 space-y-2`}>
          <div className="flex justify-between text-sm font-medium">
            <span>Gross Income</span>
            <span>${section.grossIncome.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Gross Expenses</span>
            <span>${section.grossExpenses.toFixed(2)}</span>
          </div>
          <div className={`flex justify-between font-bold p-2 rounded ${totalColors[color]}`}>
            <span>Net Rental Income</span>
            <span>${section.netRentalIncome.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showTransactions, setShowTransactions] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedResults = sessionStorage.getItem('rentalResults');
    if (storedResults) {
      setResults(JSON.parse(storedResults));
    } else {
      router.push('/');
    }
  }, [router]);

  const downloadExcel = async () => {
    if (!results || !results.workingPaper) return;

    setDownloading(true);
    try {
      const response = await fetch('/api/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workingPaper: results.workingPaper,
          transactions: results.transactions || [],
          failedFiles: results.failedFiles || []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate Excel file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rental_Transactions_${results.workingPaper.clientName.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Failed to download Excel file');
    } finally {
      setDownloading(false);
    }
  };

  const downloadJSON = () => {
    if (!results) return;

    const dataStr = JSON.stringify(results.workingPaper, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `rental-schedule-${results.workingPaper.clientName.replace(/\s+/g, '_')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!results || !results.workingPaper) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const { workingPaper } = results;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Rental Property Working Paper</h2>
            <p className="text-gray-600 mt-2">
              Generated for {workingPaper.clientName}
              {results.processingTime && ` • Processed in ${(results.processingTime / 1000).toFixed(2)}s`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadExcel}
              disabled={downloading}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors duration-200 flex items-center shadow-md"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Excel
                </>
              )}
            </button>
            <button
              onClick={downloadJSON}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 flex items-center shadow-md"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              JSON
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors duration-200 flex items-center shadow-md"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Schedule
            </Link>
          </div>
        </div>
      </div>

      {/* Client Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Client Name:</label>
            <p className="font-medium">{workingPaper.clientName}</p>
          </div>
          {workingPaper.propertyAddress && (
            <div>
              <label className="text-sm text-gray-600">Property:</label>
              <p className="font-medium">{workingPaper.propertyAddress}</p>
            </div>
          )}
          <div>
            <label className="text-sm text-gray-600">Financial Year:</label>
            <p className="font-medium">{workingPaper.financialYear}</p>
          </div>
          {workingPaper.datesRented?.start && (
            <div>
              <label className="text-sm text-gray-600">Rental Period:</label>
              <p className="font-medium">
                {workingPaper.datesRented.start} to {workingPaper.datesRented.end || 'Current'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction List with Duplicate Highlighting */}
      {results.transactions && results.transactions.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Transaction Analysis</h3>
            <button
              onClick={() => setShowTransactions(!showTransactions)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showTransactions ? 'Hide' : 'Show'} Transactions
            </button>
          </div>
          {showTransactions && <TransactionList transactions={results.transactions} />}
        </>
      )}

      {/* Three Section Layout */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <SectionCard
          title="Rental Summary"
          subtitle="From Agent Statements"
          section={workingPaper.rentalSummary}
          color="blue"
        />
        <SectionCard
          title="Items Other Than Agent Summary"
          subtitle="Supporting Documents"
          section={workingPaper.itemsOtherThanAgentSummary}
          color="green"
        />
        <SectionCard
          title="Agent Summary"
          subtitle="From Agent's Report"
          section={workingPaper.agentSummary}
          color="purple"
        />
      </div>

      {/* Overall Totals */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Totals</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Gross Income</p>
            <p className="text-2xl font-bold text-green-600">${workingPaper.totalGrossIncome.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Gross Expenses</p>
            <p className="text-2xl font-bold text-red-600">${workingPaper.totalGrossExpenses.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Net Rental Income</p>
            <p className="text-2xl font-bold text-blue-600">${workingPaper.totalNetRentalIncome.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Failed Files */}
      {results.failedFiles && results.failedFiles.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800">Failed to Process</h4>
          <ul className="mt-2 text-sm text-red-700">
            {results.failedFiles.map((file, idx) => (
              <li key={idx}>• {file}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}