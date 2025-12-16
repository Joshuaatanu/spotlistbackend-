import { useState } from 'react';
import { Upload, FileText, Clock, Settings, Database, Download, Activity } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from './config';
import FileUpload from './components/FileUpload';
import AeosDataFetch from './components/AeosDataFetchOptimized';
import ConfigPanel from './components/ConfigPanel';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function App() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [dataSource, setDataSource] = useState('file'); // 'file' or 'aeos'
  const [file, setFile] = useState(null);
  const [companyName, setCompanyName] = useState('');
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div style={{ marginLeft: '260px', width: 'calc(100% - 260px)', display: 'flex', flexDirection: 'column' }}>
        <Header />

        <main className="container" style={{ flex: 1, maxWidth: '100%', padding: '40px' }}>
          
          {/* Page Header (Breadcrumbs like) */}
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>
                {activeTab === 'analyze' ? 'Overview' : 
                 activeTab === 'results' ? 'Analysis Results' : 
                 activeTab === 'history' ? 'Payment History' : 
                 activeTab === 'configuration' ? 'Settings' : activeTab}
              </h2>
            </div>
            {activeTab === 'analyze' && (
                <div style={{ textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}>Manage</div>
            )}
            {activeTab === 'results' && (
                <div style={{ textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}>Manage</div>
            )}
          </div>

          {/* Content */}
          {activeTab === 'analyze' && (
            <div className="animate-in">
              <div className="analyze-layout" style={{ 
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)',
                gap: '32px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <section className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-l)' }}>
                      {dataSource === 'file' ? (
                        <Upload size={20} style={{ color: 'var(--text-primary)' }} />
                      ) : (
                        <Database size={20} style={{ color: 'var(--text-primary)' }} />
                      )}
                      <h3>{dataSource === 'file' ? 'Upload Spotlist' : 'Fetch from AEOS TV Audit'}</h3>
                    </div>
                    
                    {/* Data Source Selector */}
                    <div style={{ 
                      display: 'flex', 
                      gap: 'var(--space-s)', 
                      marginBottom: 'var(--space-l)',
                      borderBottom: '1px solid var(--border-color)',
                      paddingBottom: 'var(--space-m)'
                    }}>
                      <button
                        onClick={() => {
                          setDataSource('file');
                          setError(null);
                        }}
                        style={{
                          padding: 'var(--space-s) var(--space-m)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: dataSource === 'file' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          color: dataSource === 'file' ? 'white' : 'var(--text-primary)',
                          fontWeight: 500,
                          transition: 'all var(--transition-base)'
                        }}
                      >
                        File Upload
                      </button>
                      <button
                        onClick={() => {
                          setDataSource('aeos');
                          setError(null);
                        }}
                        style={{
                          padding: 'var(--space-s) var(--space-m)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: dataSource === 'aeos' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          color: dataSource === 'aeos' ? 'white' : 'var(--text-primary)',
                          fontWeight: 500,
                          transition: 'all var(--transition-base)'
                        }}
                      >
                        AEOS TV Audit
                      </button>
                    </div>

                    {/* Conditional rendering based on data source */}
                    {dataSource === 'file' ? (
                      <FileUpload file={file} setFile={setFile} />
                    ) : (
                      <AeosDataFetch
                        companyName={companyName}
                        setCompanyName={setCompanyName}
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
                      <div style={{
                        marginTop: 'var(--space-m)',
                        padding: 'var(--space-m)',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-s)',
                        color: '#991B1B'
                      }}>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Collection Complete - Show Options */}
                    {dataSource === 'aeos' && collectedData && !loading && (
                      <div style={{
                        marginTop: 'var(--space-l)',
                        padding: 'var(--space-l)',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        border: '2px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-s)',
                          marginBottom: 'var(--space-m)'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '24px' }}>✓</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              fontSize: 'var(--font-size-lg)',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              margin: 0,
                              marginBottom: 'var(--space-xs)'
                            }}>
                              Data Collection Complete!
                            </h3>
                            <p style={{
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--text-secondary)',
                              margin: 0
                            }}>
                              Found {collectedData.metadata.total_spots} spots from {collectedData.metadata.channels_found.length} channel(s)
                            </p>
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          gap: 'var(--space-m)',
                          marginTop: 'var(--space-m)'
                        }}>
                          <button
                            onClick={handleDownloadRawData}
                            style={{
                              flex: 1,
                              padding: 'var(--space-m) var(--space-l)',
                              backgroundColor: 'var(--bg-secondary)',
                              border: '2px solid var(--border-color)',
                              borderRadius: '8px',
                              color: 'var(--text-primary)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: 'var(--font-size-base)',
                              transition: 'all var(--transition-base)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 'var(--space-s)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                              e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                            }}
                          >
                            <Download size={20} />
                            Download Raw Data
                          </button>
                          
                          <button
                            onClick={handleAnalyzeCollectedData}
                            style={{
                              flex: 1,
                              padding: 'var(--space-m) var(--space-l)',
                              backgroundColor: 'var(--accent-primary)',
                              border: 'none',
                              borderRadius: '8px',
                              color: 'white',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: 'var(--font-size-base)',
                              transition: 'all var(--transition-base)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 'var(--space-s)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '0.9';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                          >
                            <Activity size={20} />
                            Analyze Data
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {dataSource === 'aeos' && loading && (
                      <div style={{
                        marginTop: 'var(--space-l)',
                        padding: 'var(--space-m)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 'var(--space-s)'
                        }}>
                          <span style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 500,
                            color: 'var(--text-primary)'
                          }}>
                            {progress.message || 'Processing...'}
                          </span>
                          <span style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            color: 'var(--accent-primary)'
                          }}>
                            {progress.percentage}%
                          </span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${progress.percentage}%`,
                            height: '100%',
                            backgroundColor: progress.stage === 'error' ? '#EF4444' : 
                                           progress.stage === 'success' ? '#10B981' : 
                                           'var(--accent-primary)',
                            transition: 'width 0.3s ease',
                            borderRadius: '4px'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Primary action button - more prominent */}
                    {dataSource === 'aeos' && (
                      <div>
                        {!loading && !collectedData && (
                          <div style={{
                            marginTop: 'var(--space-m)',
                            padding: 'var(--space-s) var(--space-m)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: '8px',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)',
                            textAlign: 'center'
                          }}>
                            ⏱️ Data collection may take several minutes depending on the number of channels and date range.
                          </div>
                        )}
                        <button
                          onClick={handleAnalyzeAeos}
                          disabled={(() => {
                            // Company name is required only for certain report types
                            const requiresCompany = ['spotlist', 'reachFrequency', 'deepAnalysis', 'daypartAnalysis'].includes(reportType);
                            return (requiresCompany && !companyName) || !dateFrom || !dateTo || loading;
                          })()}
                          className="btn"
                          style={{ 
                            width: '100%', 
                            marginTop: 'var(--space-m)',
                            padding: 'var(--space-m) var(--space-l)',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600,
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: (() => {
                              const requiresCompany = ['spotlist', 'reachFrequency', 'deepAnalysis', 'daypartAnalysis'].includes(reportType);
                              return ((requiresCompany && !companyName) || !dateFrom || !dateTo || loading) ? 'not-allowed' : 'pointer';
                            })(),
                            opacity: (() => {
                              const requiresCompany = ['spotlist', 'reachFrequency', 'deepAnalysis', 'daypartAnalysis'].includes(reportType);
                              return ((requiresCompany && !companyName) || !dateFrom || !dateTo || loading) ? 0.6 : 1;
                            })(),
                            transition: 'opacity var(--transition-base)'
                          }}
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
                        </button>
                      </div>
                    )}
                  </section>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <section className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-l)' }}>
                      <Settings size={20} style={{ color: 'var(--text-primary)' }} />
                      <h3>Configuration</h3>
                    </div>
                    <ConfigPanel config={config} setConfig={setConfig} />

                    <button
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
                      className="btn"
                      style={{ width: '100%', marginTop: 'var(--space-l)' }}
                    >
                      {loading ? (
                        <>
                          <div className="loading-spinner" />
                          {dataSource === 'aeos' ? 'Fetching & Analyzing...' : 'Analyzing...'}
                        </>
                      ) : (
                        'Run Analysis'
                      )}
                    </button>
                  </section>
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
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                  <Clock size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
                  <p className="text-secondary">No analysis history yet.</p>
                </div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectHistory(item)}
                    >
                      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <FileText size={20} style={{ color: 'var(--accent-primary-dark)' }} />
                        <span className="text-tertiary" style={{ fontSize: '12px' }}>
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>
                        {item.fileName}
                      </h3>
                      {item.metrics && (
                        <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                          <div>
                            <div className="text-tertiary" style={{ fontSize: '12px' }}>Spots</div>
                            <div style={{ fontWeight: 600 }}>{item.metrics.total_spots?.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-tertiary" style={{ fontSize: '12px' }}>Double</div>
                            <div style={{ fontWeight: 600, color: 'var(--accent-warning)' }}>
                              {item.metrics.double_spots?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'configuration' && (
            <div className="animate-in">
              <div className="card" style={{ maxWidth: '600px' }}>
                <ConfigPanel config={config} setConfig={setConfig} />
                <button
                  className="btn"
                  style={{ marginTop: '24px' }}
                  onClick={() => {
                    localStorage.setItem('spotlistConfig', JSON.stringify(config));
                    alert('Settings saved as default');
                  }}
                >
                  Save as Default
                </button>
              </div>
            </div>
          )}
      </main>
      </div>
    </div>
  );
}

export default App;
