import { useState } from 'react';
import { Sparkles, Key, AlertCircle, X, CheckCircle2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function AIInsights({ metrics }) {
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState(null);
    const [error, setError] = useState(null);

    const handleSaveKey = () => {
        if (!apiKey.trim()) return;
        localStorage.setItem('openai_api_key', apiKey);
        setShowKeyInput(false);
    };

    const handleClearKey = () => {
        localStorage.removeItem('openai_api_key');
        setApiKey('');
        setShowKeyInput(false);
        setInsights(null);
    };

    const generateInsights = async () => {
        if (!apiKey) {
            setShowKeyInput(true);
            return;
        }

        setLoading(true);
        setError(null);
        setInsights(null);
        
        try {
            const response = await axios.post(`${API_BASE_URL}/generate-insights`, {
                metrics: metrics,
                apiKey: apiKey
            });
            setInsights(response.data.insights);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || 'Failed to generate insights. Check your API Key.';
            setError(msg);
            if (msg.includes('API Key') || msg.includes('key')) {
                setShowKeyInput(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ 
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            position: 'relative',
            overflow: 'visible'
        }}>
            {/* Decorative gradient overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%)',
                opacity: 0.8
            }} />

            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '24px',
                paddingTop: '4px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}>
                        <Sparkles size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, marginBottom: '4px' }}>
                            AI Audit Insights
                        </h3>
                        <p style={{ 
                            margin: 0, 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--text-tertiary)',
                            fontWeight: 'var(--font-weight-normal)'
                        }}>
                            Powered by GPT-4o-mini
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    style={{ 
                        background: showKeyInput ? 'var(--bg-tertiary)' : 'transparent', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)',
                        transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                        if (!showKeyInput) {
                            e.currentTarget.style.background = 'var(--bg-tertiary)';
                            e.currentTarget.style.borderColor = 'var(--border-strong)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!showKeyInput) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                        }
                    }}
                >
                    <Key size={14} />
                    {apiKey ? 'Update Key' : 'Set API Key'}
                </button>
            </div>

            {/* API Key Input */}
            {showKeyInput && (
                <div style={{ 
                    marginBottom: '24px', 
                    padding: '20px', 
                    backgroundColor: 'var(--bg-tertiary)', 
                    borderRadius: '12px', 
                    border: '1.5px solid var(--border-color)',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <label style={{ 
                            display: 'block', 
                            fontSize: 'var(--font-size-sm)', 
                            fontWeight: 'var(--font-weight-semibold)', 
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em'
                        }}>
                            OpenAI API Key
                        </label>
                        <button
                            onClick={() => setShowKeyInput(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-tertiary)',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            style={{ 
                                flex: 1,
                                fontFamily: 'monospace',
                                fontSize: 'var(--font-size-sm)'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSaveKey();
                                }
                            }}
                        />
                        <button 
                            onClick={handleSaveKey} 
                            className="btn"
                            disabled={!apiKey.trim()}
                            style={{ minWidth: '80px' }}
                        >
                            Save
                        </button>
                    </div>
                    {apiKey && (
                        <button
                            onClick={handleClearKey}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent-error)',
                                fontSize: 'var(--font-size-xs)',
                                cursor: 'pointer',
                                padding: '4px 0',
                                fontWeight: 'var(--font-weight-medium)'
                            }}
                        >
                            Clear API Key
                        </button>
                    )}
                    <p style={{ 
                        fontSize: 'var(--font-size-xs)', 
                        color: 'var(--text-tertiary)', 
                        marginTop: '10px',
                        marginBottom: 0,
                        lineHeight: '1.5'
                    }}>
                        Your key is stored locally in your browser and sent only to the backend for this request.
                    </p>
                </div>
            )}

            {/* Empty State */}
            {!insights && !loading && !error && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '48px 24px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border-color)'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)'
                    }}>
                        <Sparkles size={32} color="white" strokeWidth={2} />
                    </div>
                    <h4 style={{ 
                        margin: '0 0 12px 0',
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--text-primary)'
                    }}>
                        Generate AI-Powered Analysis
                    </h4>
                    <p style={{ 
                        color: 'var(--text-secondary)', 
                        marginBottom: '24px',
                        fontSize: 'var(--font-size-sm)',
                        maxWidth: '400px',
                        margin: '0 auto 24px',
                        lineHeight: '1.6'
                    }}>
                        Get professional insights and recommendations based on industry benchmarks and best practices.
                    </p>
                    <button 
                        onClick={generateInsights} 
                        className="btn" 
                        disabled={!apiKey}
                        style={{ 
                            background: apiKey ? 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)' : 'var(--border-color)',
                            color: apiKey ? 'white' : 'var(--text-tertiary)',
                            border: 'none',
                            padding: '12px 24px',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-semibold)',
                            boxShadow: apiKey ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                            cursor: apiKey ? 'pointer' : 'not-allowed'
                        }}
                    >
                        <Sparkles size={18} style={{ marginRight: '8px' }} />
                        Generate Analysis
                    </button>
                    {!apiKey && (
                        <p style={{
                            marginTop: '12px',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-tertiary)'
                        }}>
                            Please set your API key first
                        </p>
                    )}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 24px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
                    borderRadius: '12px'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '3px solid rgba(59, 130, 246, 0.2)',
                        borderTopColor: '#3B82F6',
                        margin: '0 auto 20px',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <p style={{ 
                        color: 'var(--text-secondary)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        margin: 0
                    }}>
                        Analyzing metrics with AI...
                    </p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#FEF2F2', 
                    borderRadius: '12px', 
                    border: '1.5px solid #FECACA',
                    color: '#DC2626', 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                }}>
                    <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ 
                            fontWeight: 'var(--font-weight-semibold)',
                            marginBottom: '4px',
                            fontSize: 'var(--font-size-sm)'
                        }}>
                            Error
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: '1.5' }}>
                            {error}
                        </div>
                    </div>
                </div>
            )}

            {/* Insights Content */}
            {insights && (
                <div style={{
                    position: 'relative'
                }}>
                    {/* Success indicator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px',
                        padding: '12px 16px',
                        backgroundColor: '#ECFDF5',
                        borderRadius: '10px',
                        border: '1px solid #A7F3D0'
                    }}>
                        <CheckCircle2 size={18} color="#059669" />
                        <span style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: '#059669'
                        }}>
                            Analysis Complete
                        </span>
                    </div>

                    {/* Markdown Content */}
                    <div className="markdown-content" style={{ 
                        fontSize: 'var(--font-size-base)',
                        color: 'var(--text-primary)',
                        lineHeight: 'var(--line-height-relaxed)',
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                        width: '100%',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap'
                    }}>
                        <style>{`
                            .markdown-content {
                                width: 100%;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                                white-space: pre-wrap;
                            }
                            .markdown-content h1,
                            .markdown-content h2,
                            .markdown-content h3,
                            .markdown-content h4 {
                                font-family: 'Space Grotesk', 'Plus Jakarta Sans', sans-serif;
                                font-weight: var(--font-weight-semibold);
                                color: var(--text-primary);
                                margin-top: 24px;
                                margin-bottom: 12px;
                                letter-spacing: -0.01em;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                            }
                            .markdown-content h1:first-child,
                            .markdown-content h2:first-child,
                            .markdown-content h3:first-child,
                            .markdown-content h4:first-child {
                                margin-top: 0;
                            }
                            .markdown-content h1 { font-size: var(--font-size-xl); }
                            .markdown-content h2 { font-size: var(--font-size-lg); }
                            .markdown-content h3 { font-size: var(--font-size-base); }
                            .markdown-content p {
                                margin-bottom: 16px;
                                color: var(--text-primary);
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                                white-space: pre-wrap;
                            }
                            .markdown-content ul,
                            .markdown-content ol {
                                margin-bottom: 16px;
                                padding-left: 24px;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                            }
                            .markdown-content li {
                                margin-bottom: 8px;
                                line-height: 1.6;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                            }
                            .markdown-content strong {
                                font-weight: var(--font-weight-semibold);
                                color: var(--text-primary);
                            }
                            .markdown-content em {
                                font-style: italic;
                            }
                            .markdown-content code {
                                background: var(--bg-tertiary);
                                padding: 2px 6px;
                                border-radius: 4px;
                                font-size: 0.9em;
                                font-family: 'Monaco', 'Courier New', monospace;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                            }
                            .markdown-content pre {
                                background: var(--bg-tertiary);
                                padding: 12px;
                                border-radius: 6px;
                                overflow-x: auto;
                                margin: 16px 0;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                            }
                            .markdown-content pre code {
                                background: transparent;
                                padding: 0;
                            }
                            .markdown-content blockquote {
                                border-left: 3px solid var(--accent-primary);
                                padding-left: 16px;
                                margin: 16px 0;
                                color: var(--text-secondary);
                                font-style: italic;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                            }
                            .markdown-content table {
                                width: 100%;
                                border-collapse: collapse;
                                margin: 16px 0;
                                overflow-x: auto;
                                display: block;
                            }
                            .markdown-content table thead,
                            .markdown-content table tbody {
                                display: table;
                                width: 100%;
                            }
                            .markdown-content th,
                            .markdown-content td {
                                padding: 8px 12px;
                                border: 1px solid var(--border-color);
                                text-align: left;
                            }
                            .markdown-content th {
                                background: var(--bg-tertiary);
                                font-weight: var(--font-weight-semibold);
                            }
                        `}</style>
                        <ReactMarkdown>{insights}</ReactMarkdown>
                    </div>

                    {/* Regenerate Button */}
                    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                            onClick={generateInsights}
                            disabled={loading}
                            className="btn"
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                width: '100%'
                            }}
                        >
                            <Sparkles size={16} />
                            Regenerate Analysis
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
