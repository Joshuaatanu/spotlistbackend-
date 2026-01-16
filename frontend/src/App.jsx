import { useEffect } from 'react';
import { Upload, Database, Settings, Clock, FileText, Download, Activity } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from './config';
import FileUpload from './components/data-input/FileUpload';
import AeosDataFetch from './components/data-input/AeosDataFetchOptimized';
import ConfigPanel from './components/data-input/ConfigPanel';
import Dashboard from './components/dashboard/Dashboard';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import AnalysisWizard from './components/data-input/AnalysisWizard';
import DashboardHome from './components/dashboard/DashboardHome';
import OnboardingTour from './components/common/OnboardingTour';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { useAnalysisHistory } from './hooks/useAnalysisHistory';
import { useAnalysisStore } from './stores/analysisStore';
import { useBackgroundJobs } from './hooks/useBackgroundJobs';
import JobsPanel from './components/common/JobsPanel';
import CompetitorSelector from './components/competitors/CompetitorSelector';
import CompetitorAnalysisView from './components/competitors/CompetitorAnalysisView';
import CompetitorAnalysisPage from './components/competitors/CompetitorAnalysisPage';

function App() {
  // Get state and actions from Zustand store
  const {
    activeTab, setActiveTab,
    dataSource, setDataSource,
    file, setFile,
    companyName, setCompanyName,
    companyId, setCompanyId,
    competitorCompanyName, setCompetitorCompanyName,
    competitorCompanyId, setCompetitorCompanyId,
    brandIds, setBrandIds,
    productIds, setProductIds,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    channelFilter, setChannelFilter,
    reportType, setReportType,
    topTenSubtype, setTopTenSubtype,
    filters, setFilters,
    config, setConfig,
    loading, startLoading, stopLoading,
    results, setResults,
    error, setError,
    progress, updateProgress,
    collectedData, setCollectedData,
    showWizard, setShowWizard,
  } = useAnalysisStore();

  const { history, saveAnalysis, deleteAnalysis, dbAvailable } = useAnalysisHistory();

  // Background jobs
  const { queueJob, hasRunningJobs, running: runningJobsCount, fetchJobWithData } = useBackgroundJobs();

  // Handler for queueing a background job
  const handleQueueBackgroundJob = async () => {
    const requiresCompany = ['spotlist', 'competitor', 'deepAnalysis', 'daypartAnalysis'].includes(reportType);
    if ((requiresCompany && !companyName) || !dateFrom || !dateTo) return;

    const jobName = companyName
      ? `${companyName} (${dateFrom} to ${dateTo})`
      : `All companies (${dateFrom} to ${dateTo})`;

    const parameters = {
      company_name: companyName || '',
      competitor_company_name: competitorCompanyName || '',
      date_from: dateFrom,
      date_to: dateTo,
      report_type: reportType === 'competitor' ? 'spotlist' : (reportType || 'spotlist'),
      channel_filter: channelFilter || '',
      brand_ids: brandIds,
      product_ids: productIds,
      weekdays: filters.weekdays,
      dayparts: filters.dayparts,
      epg_categories: filters.epgCategories,
      profiles: filters.profiles,
      ...config
    };

    try {
      await queueJob({
        job_name: jobName,
        job_type: reportType || 'spotlist',
        parameters
      });
      // Switch to jobs tab to show progress
      setActiveTab('jobs');
    } catch (error) {
      setError(error.message || 'Failed to queue background job');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    startLoading();
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    Object.keys(config).forEach(key => {
      formData.append(key, config[key]);
    });

    try {
      const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const analysisResult = {
        ...response.data,
        fileName: file.name,
        timestamp: new Date().toISOString(),
        id: Date.now()
      };
      setResults(analysisResult);
      saveAnalysis(analysisResult); // Save to database
      setActiveTab('results');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred during analysis.');
    } finally {
      stopLoading();
    }
  };

  const handleAnalyzeAeos = async () => {
    // Company name is required only for certain report types
    // Note: topTen and reachFrequency do NOT require company name
    const requiresCompany = ['spotlist', 'competitor', 'deepAnalysis', 'daypartAnalysis'].includes(reportType);
    if ((requiresCompany && !companyName) || !dateFrom || !dateTo) return;

    setCollectedData(null); // Clear any previously collected data (before startLoading!)
    setError(null);
    startLoading();
    updateProgress({ percentage: 0, message: 'Starting data collection...', stage: 'info' });

    const formData = new FormData();
    formData.append('company_name', companyName || '');
    formData.append('competitor_company_name', competitorCompanyName || '');
    formData.append('date_from', dateFrom);
    formData.append('date_to', dateTo);
    // Competitor analysis uses spotlist data, so map it to 'spotlist' for backend
    const backendReportType = reportType === 'competitor' ? 'spotlist' : (reportType || 'spotlist');
    formData.append('report_type', backendReportType);
    // Always send channel_filter, even if empty (backend will handle it)
    formData.append('channel_filter', channelFilter || '');
    // Add Top Ten subtype (always send, defaults to 'spots' if not Top Ten)
    formData.append('top_ten_subtype', reportType === 'topTen' ? (topTenSubtype || 'spots') : 'spots');

    // Add brand and product IDs (for spotlist and competitor reports)
    if ((reportType === 'spotlist' || reportType === 'competitor') && brandIds && brandIds.length > 0) {
      formData.append('brand_ids', JSON.stringify(brandIds));
    }
    if ((reportType === 'spotlist' || reportType === 'competitor') && productIds && productIds.length > 0) {
      formData.append('product_ids', JSON.stringify(productIds));
    }

    // Add enhanced filters
    if (filters.weekdays && filters.weekdays.length > 0) {
      formData.append('weekdays', JSON.stringify(filters.weekdays));
    }
    if (filters.dayparts && filters.dayparts.length > 0) {
      formData.append('dayparts', JSON.stringify(filters.dayparts));
    }
    if (filters.epgCategories && filters.epgCategories.length > 0) {
      formData.append('epg_categories', JSON.stringify(filters.epgCategories));
    }
    if (filters.profiles && filters.profiles.length > 0) {
      formData.append('profiles', JSON.stringify(filters.profiles));
    }

    Object.keys(config).forEach(key => {
      formData.append(key, config[key]);
    });

    try {
      // Use fetch instead of axios for SSE support
      const response = await fetch(`${API_BASE_URL}/analyze-from-aeos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.message === 'collection_complete' && data.raw_data) {
                // Raw data collection complete - show options to download or analyze
                setCollectedData({
                  raw_data: data.raw_data.raw_data,
                  metadata: data.raw_data.metadata,
                  fileName: `${companyName}_${dateFrom}_to_${dateTo}`,
                  timestamp: new Date().toISOString()
                });
                stopLoading();
                updateProgress({
                  percentage: 100,
                  message: `Data collection complete! Found ${data.raw_data.metadata.total_spots} spots.`,
                  stage: 'success'
                });
                return;
              } else if (data.message === 'complete' && data.result) {
                // Final analysis result received
                const analysisResult = {
                  ...data.result,
                  fileName: `${companyName}_${dateFrom}_to_${dateTo}`,
                  timestamp: new Date().toISOString(),
                  id: Date.now()
                };
                setResults(analysisResult);
                setCollectedData(null); // Clear collected data after analysis
                saveAnalysis(analysisResult); // Save to database
                setActiveTab('results');
                stopLoading();
                return;
              } else {
                // Progress update
                updateProgress({
                  percentage: data.progress || 0,
                  message: data.message || '',
                  stage: data.stage || 'info'
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
      stopLoading();
      setCollectedData(null);
    }
  };

  const handleAnalyzeCollectedData = async () => {
    if (!collectedData) return;

    startLoading();
    setError(null);
    updateProgress({ percentage: 0, message: 'Processing collected data...', stage: 'info' });

    // Check if this is a non-spotlist report type that doesn't need backend analysis
    const reportType = collectedData.metadata?.report_type;
    const skipBackendAnalysis = ['topTen', 'reachFrequency', 'deepAnalysis'].includes(reportType);

    if (skipBackendAnalysis) {
      // For Top Ten, R&F, Deep Analysis - display the data directly without /analyze
      const displayResult = {
        data: collectedData.raw_data,
        fileName: collectedData.fileName,
        timestamp: new Date().toISOString(),
        id: Date.now(),
        metadata: collectedData.metadata || { report_type: reportType },
        metrics: {
          total_records: collectedData.raw_data?.length || 0
        }
      };
      setResults(displayResult);
      setCollectedData(null);
      saveAnalysis(displayResult);
      setActiveTab('results');
      stopLoading();
      return;
    }

    // For spotlist data, send to /analyze for double booking detection
    const csvData = convertToCSV(collectedData.raw_data);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const file = new File([blob], `${collectedData.fileName}.csv`, { type: 'text/csv' });

    const formData = new FormData();
    formData.append('file', file);
    Object.keys(config).forEach(key => {
      formData.append(key, config[key]);
    });

    try {
      const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const analysisResult = {
        ...response.data,
        fileName: collectedData.fileName,
        timestamp: new Date().toISOString(),
        id: Date.now(),
        // Preserve metadata from collected data (including report_type)
        metadata: collectedData.metadata || response.data.metadata || {}
      };
      setResults(analysisResult);
      setCollectedData(null);
      saveAnalysis(analysisResult); // Save to database
      setActiveTab('results');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred during analysis.');
    } finally {
      stopLoading();
    }
  };

  const handleDownloadRawData = () => {
    if (!collectedData || !collectedData.raw_data || collectedData.raw_data.length === 0) return;

    // Convert to CSV
    const csvData = convertToCSV(collectedData.raw_data);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `raw_data_${collectedData.fileName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper function to convert data to CSV
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  };

  const handleSelectHistory = (analysis) => {
    // Normalize data structure from database format to Dashboard expected format
    // Database stores: spotlist_data, file_name, created_at, metadata.window_summaries
    // Dashboard expects: data, fileName, timestamp, window_summaries at top level
    const normalizedResults = {
      ...analysis,
      // Map database fields to expected fields
      data: analysis.data || analysis.spotlist_data || [],
      fileName: analysis.fileName || analysis.file_name,
      timestamp: analysis.timestamp || analysis.created_at,
      // Extract window_summaries and field_map from metadata if stored there
      window_summaries: analysis.window_summaries || analysis.metadata?.window_summaries || [],
      field_map: analysis.field_map || analysis.metadata?.field_map || null,
      // Keep original metrics
      metrics: analysis.metrics || {},
      metadata: {
        ...analysis.metadata,
        report_type: analysis.metadata?.report_type || 'spotlist'
      }
    };
    setResults(normalizedResults);
    setActiveTab('results');
  };

  return (
    <>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <div className="ml-[260px] w-[calc(100%-260px)] flex flex-col">
          <Header />

          <main className="flex-1 max-w-full p-10">

            {/* Page Header (Breadcrumbs like) */}
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  {activeTab === 'analyze'
                    ? (history.length > 0 && !showWizard ? 'Dashboard' : 'New Analysis')
                    : activeTab === 'results' ? 'Analysis Results'
                      : activeTab === 'history' ? 'Analysis History'
                        : activeTab === 'jobs' ? 'Background Jobs'
                          : activeTab === 'competitors' ? 'Competitor Analysis'
                            : activeTab === 'configuration' ? 'Settings' : activeTab}
                </h2>
              </div>
              {(activeTab === 'analyze' || activeTab === 'results') && (
                <span className="underline font-semibold cursor-pointer">Manage</span>
              )}
            </div>

            {/* Content */}
            {activeTab === 'analyze' && (
              <div>
                {/* Show Dashboard if user has history and not in wizard mode */}
                {history.length > 0 && !showWizard ? (
                  <DashboardHome
                    history={history}
                    onStartNewAnalysis={() => setShowWizard(true)}
                    onViewHistory={() => setActiveTab('history')}
                    onSelectAnalysis={(analysis) => {
                      handleSelectHistory(analysis);
                    }}
                    onDeleteAnalysis={deleteAnalysis}
                  />
                ) : (
                  /* Show Wizard for new analysis */
                  <AnalysisWizard
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    file={file}
                    setFile={setFile}
                    companyName={companyName}
                    setCompanyName={setCompanyName}
                    companyId={companyId}
                    setCompanyId={setCompanyId}
                    competitorCompanyName={competitorCompanyName}
                    setCompetitorCompanyName={setCompetitorCompanyName}
                    competitorCompanyId={competitorCompanyId}
                    setCompetitorCompanyId={setCompetitorCompanyId}
                    brandIds={brandIds}
                    setBrandIds={setBrandIds}
                    productIds={productIds}
                    setProductIds={setProductIds}
                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                    channelFilter={channelFilter}
                    setChannelFilter={setChannelFilter}
                    reportType={reportType}
                    setReportType={setReportType}
                    filters={filters}
                    setFilters={setFilters}
                    topTenSubtype={topTenSubtype}
                    setTopTenSubtype={setTopTenSubtype}
                    config={config}
                    setConfig={setConfig}
                    onAnalyze={handleAnalyze}
                    onAnalyzeAeos={handleAnalyzeAeos}
                    loading={loading}
                    error={error}
                    progress={progress}
                    collectedData={collectedData}
                    onAnalyzeCollectedData={handleAnalyzeCollectedData}
                    onDownloadRawData={handleDownloadRawData}
                    onQueueBackgroundJob={handleQueueBackgroundJob}
                  />
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && results && (
              <div className="animate-in">
                <Dashboard data={results} />
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="animate-in">
                {history.length === 0 ? (
                  <Card className="text-center py-16">
                    <CardContent>
                      <Clock className="size-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No analysis history yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
                    {history.map((item) => (
                      <Card
                        key={item.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleSelectHistory(item)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <FileText className="size-5 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {(() => {
                                const dateStr = item.timestamp || item.created_at;
                                if (!dateStr) return 'Unknown date';
                                const date = new Date(dateStr);
                                return isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString();
                              })()}
                            </span>
                          </div>
                          <h3 className="font-semibold mb-2">
                            {item.fileName || item.file_name || 'Unnamed analysis'}
                          </h3>
                          {item.metrics && (
                            <div className="flex gap-4 mt-4">
                              <div>
                                <div className="text-xs text-muted-foreground">Spots</div>
                                <div className="font-semibold">{item.metrics.total_spots?.toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Double</div>
                                <div className="font-semibold text-amber-500">
                                  {item.metrics.double_spots?.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Competitors Tab */}
            {activeTab === 'competitors' && (
              <CompetitorAnalysisPage />
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <div className="animate-in">
                <JobsPanel
                  onViewJobData={async (job) => {
                    // Fetch full job data and download as CSV
                    try {
                      const fullJob = await fetchJobWithData(job.id);

                      if (fullJob.result_data && fullJob.result_data.length > 0) {
                        // Convert to CSV
                        const data = fullJob.result_data;
                        const headers = Object.keys(data[0]);
                        const csvRows = [
                          headers.join(','),
                          ...data.map(row =>
                            headers.map(h => {
                              const val = row[h];
                              // Escape quotes and wrap in quotes if contains comma
                              if (val === null || val === undefined) return '';
                              const str = String(val);
                              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                                return `"${str.replace(/"/g, '""')}"`;
                              }
                              return str;
                            }).join(',')
                          )
                        ];
                        const csvContent = csvRows.join('\n');

                        // Download file
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${fullJob.job_name.replace(/[^a-z0-9]/gi, '_')}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      } else if (fullJob.result_metadata?.data_too_large) {
                        alert(`Data too large to download (${fullJob.result_metadata.data_size_mb}MB). The data was collected but not stored in the database due to size limits.`);
                      } else {
                        alert('No data available for this job.');
                      }
                    } catch (error) {
                      console.error('Error fetching job data:', error);
                    }
                  }}
                  onAnalyzeJob={async (job) => {
                    // Fetch full job data including result_data
                    try {
                      const fullJob = await fetchJobWithData(job.id);

                      if (!fullJob.result_data) {
                        if (fullJob.result_metadata?.data_too_large) {
                          alert(`Cannot analyze - data was too large to store (${fullJob.result_metadata.data_size_mb}MB).`);
                        } else {
                          alert('No data available for analysis.');
                        }
                        return;
                      }

                      // Set up the collected data and run analysis
                      setCollectedData({
                        raw_data: fullJob.result_data,
                        metadata: {
                          ...fullJob.result_metadata,
                          total_spots: fullJob.result_data?.length || 0
                        }
                      });

                      // Switch to analyze tab and trigger analysis
                      setActiveTab('analyze');

                      // Run the analysis
                      await handleAnalyzeCollectedData();
                    } catch (error) {
                      console.error('Error analyzing job data:', error);
                    }
                  }}
                />
              </div>
            )}

            {/* Configuration Tab */}
            {activeTab === 'configuration' && (
              <div className="animate-in">
                <Card className="max-w-xl">
                  <CardContent className="pt-6">
                    <ConfigPanel config={config} setConfig={setConfig} />
                    <Button
                      className="mt-6"
                      onClick={() => {
                        localStorage.setItem('spotlistConfig', JSON.stringify(config));
                        alert('Settings saved as default');
                      }}
                    >
                      Save as Default
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
      <Toaster />
      <OnboardingTour />
    </>
  );
}

export default App;
