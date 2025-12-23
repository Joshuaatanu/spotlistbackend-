import { useState, useEffect } from 'react';
import { Upload, Database, Settings, Clock, FileText, Download, Activity } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from './config';
import FileUpload from './components/FileUpload';
import AeosDataFetch from './components/AeosDataFetchOptimized';
import ConfigPanel from './components/ConfigPanel';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

function App() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [dataSource, setDataSource] = useState('file'); // 'file' or 'aeos'
  const [file, setFile] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState(null);
  const [brandIds, setBrandIds] = useState([]);
  const [productIds, setProductIds] = useState([]);

  // Reset brand and product selections when company changes
  useEffect(() => {
    if (!companyId) {
      setBrandIds([]);
      setProductIds([]);
    }
  }, [companyId]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [reportType, setReportType] = useState('spotlist');
  const [topTenSubtype, setTopTenSubtype] = useState('spots'); // 'spots', 'events', or 'channel'
  const [filters, setFilters] = useState({
    weekdays: [],
    dayparts: [],
    epgCategories: [],
    profiles: []
  });
  const [config, setConfig] = useState({
    creative_match_mode: 1,
    creative_match_text: '',
    time_window_minutes: 60
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [progress, setProgress] = useState({ percentage: 0, message: '', stage: 'info' });
  const [collectedData, setCollectedData] = useState(null); // Store raw collected data

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
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
      setHistory(prev => [analysisResult, ...prev].slice(0, 10)); // Keep last 10
      setActiveTab('results');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAeos = async () => {
    // Company name is required only for certain report types
    const requiresCompany = ['spotlist', 'reachFrequency', 'deepAnalysis', 'daypartAnalysis'].includes(reportType);
    if ((requiresCompany && !companyName) || !dateFrom || !dateTo) return;

    setLoading(true);
    setError(null);
    setCollectedData(null); // Clear any previously collected data
    setProgress({ percentage: 0, message: 'Starting data collection...', stage: 'info' });

    const formData = new FormData();
    formData.append('company_name', companyName || '');
    formData.append('date_from', dateFrom);
    formData.append('date_to', dateTo);
    formData.append('report_type', reportType || 'spotlist');
    // Always send channel_filter, even if empty (backend will handle it)
    formData.append('channel_filter', channelFilter || '');
    // Add Top Ten subtype (always send, defaults to 'spots' if not Top Ten)
    formData.append('top_ten_subtype', reportType === 'topTen' ? (topTenSubtype || 'spots') : 'spots');

    // Add brand and product IDs (for spotlist reports)
    if (reportType === 'spotlist' && brandIds && brandIds.length > 0) {
      formData.append('brand_ids', JSON.stringify(brandIds));
    }
    if (reportType === 'spotlist' && productIds && productIds.length > 0) {
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
                setLoading(false);
                setProgress({
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
                setHistory(prev => [analysisResult, ...prev].slice(0, 10));
                setActiveTab('results');
                setLoading(false);
                return;
              } else {
                // Progress update
                setProgress({
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
      setLoading(false);
      setCollectedData(null);
    }
  };

  const handleAnalyzeCollectedData = async () => {
    if (!collectedData) return;

    setLoading(true);
    setError(null);
    setProgress({ percentage: 0, message: 'Analyzing collected data...', stage: 'info' });

    // Convert raw data to a file-like object for the analyze endpoint
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
      setHistory(prev => [analysisResult, ...prev].slice(0, 10));
      setActiveTab('results');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred during analysis.');
    } finally {
      setLoading(false);
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
    setResults(analysis);
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
                  {activeTab === 'analyze' ? 'Overview' :
                    activeTab === 'results' ? 'Analysis Results' :
                      activeTab === 'history' ? 'Payment History' :
                        activeTab === 'configuration' ? 'Settings' : activeTab}
                </h2>
              </div>
              {(activeTab === 'analyze' || activeTab === 'results') && (
                <span className="underline font-semibold cursor-pointer">Manage</span>
              )}
            </div>

            {/* Content */}
            {activeTab === 'analyze' && (
              <div className="animate-in">
                <div className="grid grid-cols-[2fr_minmax(320px,1fr)] gap-8">
                  <div className="flex flex-col gap-8">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {dataSource === 'file' ? (
                            <Upload className="size-5" />
                          ) : (
                            <Database className="size-5" />
                          )}
                          {dataSource === 'file' ? 'Upload Spotlist' : 'Fetch from AEOS TV Audit'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Data Source Selector */}
                        <Tabs value={dataSource} onValueChange={(v) => { setDataSource(v); setError(null); }} className="mb-6">
                          <TabsList>
                            <TabsTrigger value="file">File Upload</TabsTrigger>
                            <TabsTrigger value="aeos">AEOS TV Audit</TabsTrigger>
                          </TabsList>
                        </Tabs>

                        {/* Conditional rendering based on data source */}
                        {dataSource === 'file' ? (
                          <FileUpload file={file} setFile={setFile} />
                        ) : (
                          <AeosDataFetch
                            companyName={companyName}
                            setCompanyName={setCompanyName}
                            companyId={companyId}
                            setCompanyId={setCompanyId}
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
                          />
                        )}

                        {error && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}

                        {/* Collection Complete - Show Options */}
                        {dataSource === 'aeos' && collectedData && !loading && (
                          <div className="mt-6 p-6 bg-emerald-500/10 border-2 border-emerald-500/25 rounded-xl">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="size-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                                <span className="text-2xl">✓</span>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-1">
                                  Data Collection Complete!
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Found {collectedData.metadata.total_spots} spots from {collectedData.metadata.channels_found.length} channel(s)
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <Button
                                variant="outline"
                                onClick={handleDownloadRawData}
                                className="flex-1"
                              >
                                <Download className="size-5" />
                                Download Raw Data
                              </Button>

                              <Button
                                onClick={handleAnalyzeCollectedData}
                                className="flex-1"
                              >
                                <Activity className="size-5" />
                                Analyze Data
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Progress Bar */}
                        {dataSource === 'aeos' && loading && (
                          <div className="mt-6 p-4 bg-muted rounded-lg border">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">
                                {progress.message || 'Processing...'}
                              </span>
                              <Badge variant={progress.stage === 'error' ? 'destructive' : progress.stage === 'success' ? 'success' : 'default'}>
                                {progress.percentage}%
                              </Badge>
                            </div>
                            <Progress
                              value={progress.percentage}
                              className={cn(
                                progress.stage === 'error' && "[&>div]:bg-destructive",
                                progress.stage === 'success' && "[&>div]:bg-emerald-500"
                              )}
                            />
                          </div>
                        )}

                        {/* Primary action button - more prominent */}
                        {dataSource === 'aeos' && (
                          <div>
                            {!loading && !collectedData && (
                              <Alert variant="info" className="mt-4">
                                <AlertDescription className="text-center">
                                  ⏱️ Data collection may take several minutes depending on the number of channels and date range.
                                </AlertDescription>
                              </Alert>
                            )}
                            <Button
                              onClick={handleAnalyzeAeos}
                              disabled={(() => {
                                // Company name is required only for certain report types
                                const requiresCompany = ['spotlist', 'reachFrequency', 'deepAnalysis', 'daypartAnalysis'].includes(reportType);
                                return (requiresCompany && !companyName) || !dateFrom || !dateTo || loading;
                              })()}
                              className="w-full mt-4"
                              size="lg"
                            >
                              {loading ? (
                                <>
                                  <div className="loading-spinner" />
                                  Collecting Data from AEOS...
                                </>
                              ) : collectedData ? (
                                '▶ Collect New Data'
                              ) : (
                                '▶ Start Data Collection'
                              )}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex flex-col gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="size-5" />
                          Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ConfigPanel config={config} setConfig={setConfig} />

                        <Button
                          onClick={dataSource === 'file' ? handleAnalyze : handleAnalyzeAeos}
                          disabled={
                            (dataSource === 'file' && !file) ||
                            (dataSource === 'aeos' && (() => {
                              // Company name is required only for certain report types
                              const requiresCompany = ['spotlist', 'reachFrequency', 'deepAnalysis', 'daypartAnalysis'].includes(reportType);
                              return (requiresCompany && !companyName) || !dateFrom || !dateTo;
                            })()) ||
                            loading
                          }
                          className="w-full mt-6"
                        >
                          {loading ? (
                            <>
                              <div className="loading-spinner" />
                              {dataSource === 'aeos' ? 'Fetching & Analyzing...' : 'Analyzing...'}
                            </>
                          ) : (
                            'Run Analysis'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
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
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-semibold mb-2">
                            {item.fileName}
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
    </>
  );
}

export default App;
