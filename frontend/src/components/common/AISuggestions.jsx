import { useState } from 'react';
import { Lightbulb, AlertCircle, Loader2, ArrowRight, Coins } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const priorityConfig = {
    high: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'High Priority' },
    medium: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Medium' },
    low: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Low' },
};

export default function AISuggestions({ metrics }) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState(null);
    const [error, setError] = useState(null);

    const generateSuggestions = async () => {
        setLoading(true);
        setError(null);
        setSuggestions(null);

        try {
            const response = await axios.post(`${API_BASE_URL}/generate-suggestions`, {
                metrics: metrics
            });
            setSuggestions(response.data.suggestions);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || 'Failed to generate suggestions.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="relative overflow-hidden border-t-4 border-t-amber-500">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Lightbulb className="size-6" strokeWidth={2.5} />
                    </div>
                    <div>
                        <CardTitle className="mb-1">AI Suggestions</CardTitle>
                        <p className="text-xs text-muted-foreground">Actionable recommendations to optimize your campaign</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Empty State */}
                {!suggestions && !loading && !error && (
                    <div className="text-center py-10 px-6 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-dashed">
                        <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/20">
                            <Lightbulb className="size-7 text-white" strokeWidth={2} />
                        </div>
                        <h4 className="text-lg font-semibold mb-2">Get Optimization Suggestions</h4>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
                            Receive personalized, actionable recommendations to reduce waste and improve campaign efficiency.
                        </p>
                        <Button
                            onClick={generateSuggestions}
                            className="shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30"
                        >
                            <Lightbulb className="size-4" />
                            Generate Suggestions
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-14 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl">
                        <Loader2 className="size-10 text-amber-500 animate-spin mx-auto mb-4" />
                        <p className="text-sm font-medium text-muted-foreground">Analyzing your data for suggestions...</p>
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

                {/* Suggestions List */}
                {suggestions && suggestions.length > 0 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className="p-4 bg-card border rounded-xl hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        <ArrowRight className="size-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                                            <Badge className={cn("text-xs", priorityConfig[suggestion.priority]?.color)}>
                                                {priorityConfig[suggestion.priority]?.label || suggestion.priority}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                                        {suggestion.potential_savings && (
                                            <div className="flex items-center gap-1.5 mt-2 text-emerald-600 dark:text-emerald-400">
                                                <Coins className="size-4" />
                                                <span className="text-sm font-medium">Potential savings: {suggestion.potential_savings}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="pt-4 border-t">
                            <Button variant="outline" onClick={generateSuggestions} disabled={loading} className="w-full">
                                <Lightbulb className="size-4" />
                                Refresh Suggestions
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
