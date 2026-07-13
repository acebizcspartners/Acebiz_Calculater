'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';

export default function Home() {
  const [agentFiles, setAgentFiles] = useState<File[]>([]);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [financialYear, setFinancialYear] = useState<string>('2026'); // Default to FY 2026
  const router = useRouter();

  // Calculate estimated AI cost
  const calculateEstimatedCost = () => {
    // Claude Sonnet 4 pricing (per million tokens)
    const INPUT_COST = 3.00;  // $3 per 1M input tokens
    const OUTPUT_COST = 15.00; // $15 per 1M output tokens

    // Rough token estimates per file type
    const AGENT_FILE_INPUT = 8000;  // ~8k tokens for agent statement
    const AGENT_FILE_OUTPUT = 1500;  // ~1.5k tokens output
    const SUPPORTING_FILE_INPUT = 3000;  // ~3k tokens for invoice/receipt
    const SUPPORTING_FILE_OUTPUT = 500;   // ~500 tokens output

    const agentInputTokens = agentFiles.length * AGENT_FILE_INPUT;
    const agentOutputTokens = agentFiles.length * AGENT_FILE_OUTPUT;
    const supportingInputTokens = supportingFiles.length * SUPPORTING_FILE_INPUT;
    const supportingOutputTokens = supportingFiles.length * SUPPORTING_FILE_OUTPUT;

    const totalInputTokens = agentInputTokens + supportingInputTokens;
    const totalOutputTokens = agentOutputTokens + supportingOutputTokens;

    const inputCost = (totalInputTokens / 1000000) * INPUT_COST;
    const outputCost = (totalOutputTokens / 1000000) * OUTPUT_COST;
    const totalCost = inputCost + outputCost;

    return {
      totalCost: totalCost.toFixed(4),
      inputTokens: Math.round(totalInputTokens).toLocaleString(),
      outputTokens: Math.round(totalOutputTokens).toLocaleString(),
    };
  };

  const costEstimate = calculateEstimatedCost();

  const onDropAgent = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      console.error('Rejected files:', rejectedFiles);
      toast.error(`${rejectedFiles.length} file(s) were rejected. Check file type.`);
    }
    if (acceptedFiles.length > 0) {
      setAgentFiles(prev => [...prev, ...acceptedFiles]);
      toast.success(`${acceptedFiles.length} agent file(s) added`);
    }
  }, []);

  const onDropSupporting = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      console.error('Rejected files:', rejectedFiles);
      toast.error(`${rejectedFiles.length} file(s) were rejected. Check file type.`);
    }
    if (acceptedFiles.length > 0) {
      setSupportingFiles(prev => [...prev, ...acceptedFiles]);
      toast.success(`${acceptedFiles.length} supporting file(s) added`);
    }
  }, []);

  const agentDropzone = useDropzone({
    onDrop: onDropAgent,
    onError: (err) => {
      console.error('Dropzone error:', err);
      toast.error('Error selecting files. Please try again.');
    },
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    multiple: true,
    disabled: processing,
  });

  const supportingDropzone = useDropzone({
    onDrop: onDropSupporting,
    onError: (err) => {
      console.error('Dropzone error:', err);
      toast.error('Error selecting files. Please try again.');
    },
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    multiple: true,
    disabled: processing,
  });

  const removeAgentFile = (index: number) => {
    setAgentFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  const removeSupportingFile = (index: number) => {
    setSupportingFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  const handleProcess = async () => {
    if (agentFiles.length === 0) {
      toast.error('Please upload at least one agent schedule');
      return;
    }

    setProcessing(true);
    const formData = new FormData();

    // Add financial year to the form data
    formData.append('financialYear', financialYear);

    agentFiles.forEach((file, index) => {
      formData.append(`agentFile${index}`, file);
    });

    supportingFiles.forEach((file, index) => {
      formData.append(`supportingFile${index}`, file);
    });

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process files');
      }

      toast.success('Files processed successfully!');

      // Store the results in sessionStorage and navigate to results page
      sessionStorage.setItem('rentalResults', JSON.stringify(data));
      router.push('/results');
    } catch (error) {
      console.error('Processing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process files');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Rental Property Schedule Generator
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Upload your agent schedules and supporting documents to automatically generate
            a complete rental property working paper in ITR format
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <span className="text-gray-500">Powered by</span>
            <span className="font-semibold text-blue-600">Claude AI</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-mono border border-blue-200">
              claude-fable-5
            </span>
          </div>
        </div>

        {/* Financial Year Selector - PROMINENT */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg border-2 border-blue-300 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                📅 Select Financial Year
              </h3>
              <p className="text-sm text-gray-700 mt-1">Select the year for tax return preparation</p>
            </div>
            <div className="flex items-center gap-4 bg-white rounded-lg px-6 py-3 shadow-md border border-blue-400">
              <label className="text-base font-bold text-blue-700">FINANCIAL YEAR:</label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="px-6 py-3 text-lg font-semibold border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-600 bg-white text-blue-900"
                disabled={processing}
              >
                <option value="2026">FY 2026 (Jul 2025 - Jun 2026)</option>
                <option value="2025">FY 2025 (Jul 2024 - Jun 2025)</option>
                <option value="2024">FY 2024 (Jul 2023 - Jun 2024)</option>
                <option value="2023">FY 2023 (Jul 2022 - Jun 2023)</option>
                <option value="2022">FY 2022 (Jul 2021 - Jun 2022)</option>
                <option value="2021">FY 2021 (Jul 2020 - Jun 2021)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <p className="text-sm text-yellow-900 font-medium">
              ⚠️ <strong>Important:</strong> Documents covering multiple periods (e.g., annual water bills, council rates) will be
              automatically apportioned for the selected financial year. Currently selected: <strong className="text-blue-700 text-base">FY {financialYear}</strong>
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Agent Schedule Upload */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold">1</span>
              Rental Agent Schedule
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload statements from your property management agent (PDF, Excel, CSV, Images)
            </p>

            <div
              {...agentDropzone.getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                agentDropzone.isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...agentDropzone.getInputProps()} disabled={processing} />
              <svg
                className="mx-auto h-12 w-12 text-blue-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {agentDropzone.isDragActive ? (
                  <span className="font-semibold text-blue-600">Drop files here</span>
                ) : (
                  <>
                    <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF, Excel, CSV, or images
              </p>
            </div>

            {/* Alternative file input button */}
            <div className="mt-3">
              <label className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <span>Choose Files Manually</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.xls,.xlsx,.csv"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      onDropAgent(files, []);
                    }
                  }}
                  className="hidden"
                  disabled={processing}
                />
              </label>
            </div>

            {agentFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {agentFiles.length} file(s) selected:
                </p>
                {agentFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center min-w-0 flex-1">
                      <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeAgentFile(index)}
                      className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Supporting Documents Upload */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold">2</span>
              Other Supporting Documents
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload invoices, receipts, and other expense documents (Optional)
            </p>

            <div
              {...supportingDropzone.getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                supportingDropzone.isDragActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
              } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...supportingDropzone.getInputProps()} disabled={processing} />
              <svg
                className="mx-auto h-12 w-12 text-green-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {supportingDropzone.isDragActive ? (
                  <span className="font-semibold text-green-600">Drop files here</span>
                ) : (
                  <>
                    <span className="font-semibold text-green-600">Click to upload</span> or drag and drop
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Invoices, receipts, bank statements
              </p>
            </div>

            {/* Alternative file input button */}
            <div className="mt-3">
              <label className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <span>Choose Files Manually</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.xls,.xlsx,.csv"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      onDropSupporting(files, []);
                    }
                  }}
                  className="hidden"
                  disabled={processing}
                />
              </label>
            </div>

            {supportingFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {supportingFiles.length} file(s) selected:
                </p>
                {supportingFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center min-w-0 flex-1">
                      <svg className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeSupportingFile(index)}
                      className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Cost Estimate */}
        {(agentFiles.length > 0 || supportingFiles.length > 0) && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Estimated AI Processing Cost</h4>
                <p className="text-xs text-gray-600">
                  {agentFiles.length} agent file(s) + {supportingFiles.length} supporting file(s)
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-700">${costEstimate.totalCost}</div>
                <div className="text-xs text-gray-500">
                  ~{costEstimate.inputTokens} input + {costEstimate.outputTokens} output tokens
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Process Button */}
        {(agentFiles.length > 0 || supportingFiles.length > 0) && (
          <div className="flex gap-4">
            <button
              onClick={handleProcess}
              disabled={processing}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-lg shadow-lg"
            >
              {processing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing with Claude AI...
                </>
              ) : (
                <>
                  <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generate Rental Summary
                </>
              )}
            </button>
            <button
              onClick={() => {
                setAgentFiles([]);
                setSupportingFiles([]);
              }}
              disabled={processing}
              className="px-6 py-4 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Information Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What this tool generates:
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Rental Summary</p>
                <p className="text-sm text-gray-600">Auto-calculated from agent statements with all income and expenses</p>
              </div>
            </div>
            <div className="flex items-start">
              <svg className="h-6 w-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Supporting Items</p>
                <p className="text-sm text-gray-600">Additional expenses from invoices and receipts</p>
              </div>
            </div>
            <div className="flex items-start">
              <svg className="h-6 w-6 text-purple-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Excel Export</p>
                <p className="text-sm text-gray-600">ITR working paper format ready for tax return</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
