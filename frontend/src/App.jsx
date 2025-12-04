import { useState } from 'react';
import { Upload, FileText, Clock, Settings } from 'lucide-react';
import axios from 'axios';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function App() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [file, setFile] = useState(null);
  const [config, setConfig] = useState({
    creative_match_mode: 2,
    creative_match_text: 'buy',
    time_window_minutes: 60
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

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
      const response = await axios.post('http://localhost:8000/analyze', formData, {
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
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeTab === 'analyze' ? 'Overview' : 
                 activeTab === 'results' ? 'Analysis Results' : 
                 activeTab === 'history' ? 'Payment History' : 
                 activeTab === 'configuration' ? 'Settings' : activeTab}
              </h2>
              <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--text-primary)', paddingBottom: '4px' }}>Overview</span>
                <span>Clients</span>
                <span>Account</span>
                <span>Payments</span>
              </div>
            </div>
            {activeTab === 'analyze' && (
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
                  {/* Stats Row Mockup for Overview */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                     <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ 
                            width: '48px', height: '48px', borderRadius: '50%', 
                            backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '20px'
                        }}>
                            💰
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Available Balance</div>
                            <div style={{ fontSize: '24px', fontWeight: 700 }}>$14,823.20</div>
                        </div>
                     </div>
                     <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ 
                            width: '48px', height: '48px', borderRadius: '50%', 
                            backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '20px'
                        }}>
                            🔥
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pending Balance</div>
                            <div style={{ fontSize: '24px', fontWeight: 700 }}>$2,498.80</div>
                        </div>
                     </div>
                  </div>

                  <section className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-l)' }}>
                      <Upload size={20} style={{ color: 'var(--text-primary)' }} />
                      <h3>Upload Spotlist</h3>
                    </div>
                    <FileUpload file={file} setFile={setFile} />

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
                      onClick={handleAnalyze}
                      disabled={!file || loading}
                      className="btn"
                      style={{ width: '100%', marginTop: 'var(--space-l)' }}
                    >
                      {loading ? (
                        <>
                          <div className="loading-spinner" />
                          Analyzing...
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
