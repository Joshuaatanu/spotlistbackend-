import { useState } from 'react';
import { Sparkles, Key, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

export default function AIInsights({ metrics }) {
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState(null);
    const [error, setError] = useState(null);

    const handleSaveKey = () => {
        localStorage.setItem('openai_api_key', apiKey);
        setShowKeyInput(false);
    };

    const generateInsights = async () => {
        if (!apiKey) {
            setShowKeyInput(true);
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.post('http://localhost:8000/generate-insights', {
                metrics: metrics,
                apiKey: apiKey
            });
            setInsights(response.data.insights);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || 'Failed to generate insights. Check your API Key.';
            setError(msg);
            if (msg.includes('API Key')) {
                setShowKeyInput(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ background: 'linear-gradient(135deg, #FFF 0%, #F0F9FF 100%)', border: '1px solid #BAE6FD' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        padding: '8px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Sparkles size={20} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        AI Audit Insights
                    </h3>
                </div>
                
                <button 
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        cursor: 'pointer',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px'
                    }}
                >
                    <Key size={14} />
                    {apiKey ? 'Update Key' : 'Set API Key'}
                </button>
            </div>

            {showKeyInput && (
                <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                        OpenAI API Key
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            style={{ flex: 1 }}
                        />
                        <button onClick={handleSaveKey} className="btn">Save</button>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                        Your key is stored locally in your browser and sent only to the backend for this request.
                    </p>
                </div>
            )}

            {!insights && !loading && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Generate a professional analysis of your spotlist performance using AI.
                    </p>
                    <button onClick={generateInsights} className="btn" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)', color: 'white', border: 'none' }}>
                        <Sparkles size={16} />
                        Generate Analysis
                    </button>
                </div>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="loading-spinner" style={{ borderColor: '#3B82F6', borderTopColor: 'transparent', margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Analyzing metrics...</p>
                </div>
            )}

            {error && (
                <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#DC2626', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {insights && (
                <div className="markdown-content" style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    <ReactMarkdown>{insights}</ReactMarkdown>
                </div>
            )}
        </div>
    );
}


