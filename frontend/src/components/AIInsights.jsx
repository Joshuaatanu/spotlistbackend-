import { useState } from 'react';
import { Sparkles, Key, AlertCircle, X, CheckCircle2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
        if (!apiKey) { setShowKeyInput(true); return; }

        setLoading(true);
        setError(null);
        setInsights(null);

        try {
            const response = await axios.post(`${API_BASE_URL}/generate-insights`, {
                metrics: metrics, apiKey: apiKey
            });
            setInsights(response.data.insights);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || 'Failed to generate insights. Check your API Key.';
            setError(msg);
            if (msg.includes('API Key') || msg.includes('key')) setShowKeyInput(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="relative overflow-hidden">
            {/* Gradient top border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80" />

            <CardHeader className="pt-5">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Sparkles className="size-6" strokeWidth={2.5} />
                        </div>
                        <div>
                            <CardTitle className="mb-1">AI Audit Insights</CardTitle>
                            <p className="text-xs text-muted-foreground">Powered by GPT-4o-mini</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowKeyInput(!showKeyInput)}>
                        <Key className="size-4" />
                        {apiKey ? 'Update Key' : 'Set API Key'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* API Key Input */}
                {showKeyInput && (
                    <div className="p-5 bg-muted rounded-xl border animate-in slide-in-from-top-2 duration-200">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-semibold">OpenAI API Key</label>
                            <Button variant="ghost" size="icon" className="size-6" onClick={() => setShowKeyInput(false)}>
                                <X className="size-4" />
                            </Button>
                        </div>
                        <div className="flex gap-2 mb-2">
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="font-mono"
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                            />
                            <Button disabled={!apiKey.trim()} onClick={handleSaveKey}>Save</Button>
                        </div>
                        {apiKey && (
                            <button onClick={handleClearKey} className="text-xs text-destructive hover:underline">
                                Clear API Key
                            </button>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            Your key is stored locally and sent only to the backend for this request.
                        </p>
                    </div>
                )}

                {/* Empty State */}
                {!insights && !loading && !error && (
                    <div className="text-center py-12 px-6 bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 rounded-xl border border-dashed">
                        <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/20">
                            <Sparkles className="size-8 text-white" strokeWidth={2} />
                        </div>
                        <h4 className="text-lg font-semibold mb-3">Generate AI-Powered Analysis</h4>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                            Get professional insights and recommendations based on industry benchmarks and best practices.
                        </p>
                        <Button
                            disabled={!apiKey}
                            onClick={generateInsights}
                            className={cn(
                                "shadow-lg",
                                apiKey && "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/30"
                            )}
                        >
                            <Sparkles className="size-4" />
                            Generate Analysis
                        </Button>
                        {!apiKey && <p className="text-xs text-muted-foreground mt-3">Please set your API key first</p>}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-16 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl">
                        <Loader2 className="size-12 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-sm font-medium text-muted-foreground">Analyzing metrics with AI...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl flex gap-3 text-red-600 dark:text-red-400">
                        <AlertCircle className="size-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm mb-1">Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Insights Content */}
                {insights && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-lg mb-5">
                            <CheckCircle2 className="size-5 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-600">Analysis Complete</span>
                        </div>

                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{insights}</ReactMarkdown>
                        </div>

                        <div className="mt-6 pt-5 border-t">
                            <Button variant="outline" onClick={generateInsights} disabled={loading} className="w-full">
                                <Sparkles className="size-4" />
                                Regenerate Analysis
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
