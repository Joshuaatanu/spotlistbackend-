import { useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { API_BASE_URL } from '../../config';
import CompetitorSelector from './CompetitorSelector';
import CompetitorAnalysisView from './CompetitorAnalysisView';

export default function CompetitorAnalysisPage() {
    const { toast } = useToast();
    const [analysisData, setAnalysisData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [myCompanyId, setMyCompanyId] = useState('');
    const [competitorIds, setCompetitorIds] = useState([]);
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const handleRunAnalysis = async () => {
        if (!myCompanyId) {
            toast({
                title: 'Company Required',
                description: 'Please select your company to analyze.',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            // Ensure all IDs are strings (backend expects strings)
            const validCompetitors = competitorIds
                .filter(id => id != null && id !== '')
                .map(id => String(id));

            const response = await fetch(`${API_BASE_URL}/api/competitors/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    my_company: String(myCompanyId),
                    competitors: validCompetitors,
                    start_date: dateRange.start,
                    end_date: dateRange.end,
                    channels: null
                })
            });

            if (!response.ok) {
                const err = await response.json();
                // Handle Pydantic validation errors
                const detail = err.detail;
                if (Array.isArray(detail)) {
                    const messages = detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
                    throw new Error(messages);
                }
                throw new Error(detail || 'Analysis failed');
            }

            const data = await response.json();
            setAnalysisData(data);
            toast({
                title: 'Analysis Complete',
                description: 'Competitor comparison data is ready.',
                variant: 'success'
            });
        } catch (err) {
            console.error(err);
            toast({
                title: 'Analysis Failed',
                description: err.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="py-16 text-center">
                <CardContent className="flex flex-col items-center gap-4">
                    <Loader2 className="size-12 animate-spin text-primary" />
                    <p className="text-lg font-medium">Fetching competitor data...</p>
                    <p className="text-sm text-muted-foreground">This may take a moment as we gather data from AEOS.</p>
                </CardContent>
            </Card>
        );
    }

    if (analysisData) {
        return (
            <div className="animate-in space-y-4">
                <div className="flex justify-end">
                    <button
                        onClick={() => setAnalysisData(null)}
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                        ← Back to Selection
                    </button>
                </div>
                <CompetitorAnalysisView data={analysisData} />
            </div>
        );
    }

    return (
        <div className="animate-in space-y-8">
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center mb-8">
                        <Users className="size-12 mx-auto text-primary mb-4" />
                        <h3 className="text-xl font-semibold mb-2">TV Competitor Analysis</h3>
                        <p className="text-muted-foreground max-w-lg mx-auto">
                            Compare your TV advertising performance against competitors.
                            Select your company and add up to 5 competitors to benchmark Share of Voice,
                            spend patterns, and channel strategies.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <CompetitorSelector
                myCompanyId={myCompanyId}
                setMyCompanyId={setMyCompanyId}
                competitorIds={competitorIds}
                setCompetitorIds={setCompetitorIds}
                dateRange={dateRange}
                setDateRange={setDateRange}
                onAnalyze={handleRunAnalysis}
                loading={loading}
            />
        </div>
    );
}
