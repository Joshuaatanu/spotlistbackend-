import { useState, useMemo, useCallback } from 'react';
import {
    Upload, GitCompare, CheckCircle2, AlertTriangle, Info,
    Download, FileText, DollarSign, Loader2, AlertCircle, Flag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

/**
 * AgencyAeosComparison - Compare agency-provided spotlist with AEOS actual data
 * 
 * Features:
 * - File upload for agency spotlist
 * - Matching algorithm with fuzzy time matching
 * - Discrepancy detection (price, duration, creative)
 * - Missing spot identification
 * - Export reconciliation report
 */
const AgencyAeosComparison = ({ aeosData = [] }) => {
    const [agencyFile, setAgencyFile] = useState(null);
    const [agencyData, setAgencyData] = useState([]);
    const [isComparing, setIsComparing] = useState(false);
    const [comparisonResults, setComparisonResults] = useState(null);
    const [parseError, setParseError] = useState(null);

    // Parse CSV file
    const parseCSV = (text) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        return lines.slice(1).map((line, idx) => {
            // Handle quoted CSV values
            const values = [];
            let current = '';
            let inQuotes = false;

            for (const char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());

            const row = { _row_id: idx };
            headers.forEach((header, i) => {
                row[header] = values[i] || '';
            });
            return row;
        });
    };

    // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAgencyFile(file);
        setParseError(null);
        setComparisonResults(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                const data = parseCSV(text);
                if (data.length === 0) {
                    setParseError('No data found in file');
                    return;
                }
                setAgencyData(data);
            } catch (err) {
                setParseError(`Failed to parse file: ${err.message}`);
            }
        };
        reader.onerror = () => setParseError('Failed to read file');
        reader.readAsText(file);
    };

    // Convert time string to seconds for comparison
    const parseTimeToSeconds = (timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const seconds = parseInt(parts[2], 10) || 0;
        return hours * 3600 + minutes * 60 + seconds;
    };

    // Normalize date format
    const normalizeDate = (dateStr) => {
        if (!dateStr) return '';
        // Try to parse various date formats
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        return dateStr;
    };

    // Check if two creatives match (fuzzy)
    const creativesMatch = (a, b) => {
        if (!a || !b) return true; // If either is missing, don't flag as mismatch
        const normalizeCreative = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizeCreative(a) === normalizeCreative(b);
    };

    // Perform comparison
    const performComparison = useCallback(() => {
        if (!agencyData.length || !aeosData.length) return;

        setIsComparing(true);

        // Detect column names in agency data
        const agencyKeys = Object.keys(agencyData[0] || {});
        const findColumn = (patterns) => {
            return agencyKeys.find(k =>
                patterns.some(p => k.toLowerCase().includes(p.toLowerCase()))
            );
        };

        const agencyChannelCol = findColumn(['channel', 'sender', 'program']);
        const agencyDateCol = findColumn(['date', 'datum', 'airing']);
        const agencyTimeCol = findColumn(['time', 'zeit', 'uhrzeit']);
        const agencyCostCol = findColumn(['cost', 'kosten', 'spend', 'price', 'preis']);
        const agencyDurationCol = findColumn(['duration', 'dauer', 'length', 'länge']);
        const agencyCreativeCol = findColumn(['creative', 'spot', 'motiv', 'material']);

        const matched = [];
        const missingInAeos = [];
        const discrepancies = [];
        const matchedAeosIds = new Set();

        agencyData.forEach(agencySpot => {
            const agencyChannel = agencySpot[agencyChannelCol] || '';
            const agencyDate = normalizeDate(agencySpot[agencyDateCol]);
            const agencyTime = agencySpot[agencyTimeCol] || '';
            const agencyCost = parseFloat(agencySpot[agencyCostCol]) || 0;
            const agencyDuration = parseInt(agencySpot[agencyDurationCol]) || 0;
            const agencyCreative = agencySpot[agencyCreativeCol] || '';

            // Find matching AEOS spot
            const aeosMatch = aeosData.find(aeosSpot => {
                if (matchedAeosIds.has(aeosSpot.id || aeosSpot._row_id)) return false;

                const aeosChannel = aeosSpot.channel_name || aeosSpot.channel_id || aeosSpot.Channel || '';
                const aeosDate = normalizeDate(aeosSpot.date || aeosSpot.timestamp?.split(' ')[0]);
                const aeosTime = aeosSpot.time || aeosSpot.timestamp?.split(' ')[1] || '';

                // Channel match (fuzzy)
                const channelMatch = aeosChannel.toLowerCase().includes(agencyChannel.toLowerCase().substring(0, 5)) ||
                    agencyChannel.toLowerCase().includes(aeosChannel.toLowerCase().substring(0, 5));

                // Date must match exactly
                const dateMatch = aeosDate === agencyDate;

                // Time within 60 seconds
                const timeDiff = Math.abs(parseTimeToSeconds(aeosTime) - parseTimeToSeconds(agencyTime));
                const timeMatch = timeDiff < 60;

                return channelMatch && dateMatch && timeMatch;
            });

            if (aeosMatch) {
                matchedAeosIds.add(aeosMatch.id || aeosMatch._row_id);

                const issues = [];
                const aeosCost = aeosMatch.cost_numeric || aeosMatch.cost || 0;
                const aeosDuration = aeosMatch.duration || 0;
                const aeosCreative = aeosMatch.creative || aeosMatch.Creative || '';

                // Price discrepancy (>€10 difference)
                if (Math.abs(aeosCost - agencyCost) > 10) {
                    issues.push({
                        type: 'price',
                        agency: agencyCost,
                        aeos: aeosCost,
                        difference: aeosCost - agencyCost
                    });
                }

                // Duration discrepancy
                if (agencyDuration > 0 && aeosDuration > 0 && aeosDuration !== agencyDuration) {
                    issues.push({
                        type: 'duration',
                        agency: agencyDuration,
                        aeos: aeosDuration
                    });
                }

                // Creative mismatch
                if (agencyCreative && aeosCreative && !creativesMatch(aeosCreative, agencyCreative)) {
                    issues.push({
                        type: 'creative',
                        agency: agencyCreative,
                        aeos: aeosCreative
                    });
                }

                if (issues.length > 0) {
                    discrepancies.push({ agencySpot, aeosSpot: aeosMatch, issues });
                } else {
                    matched.push({ agencySpot, aeosSpot: aeosMatch });
                }
            } else {
                missingInAeos.push(agencySpot);
            }
        });

        // Find spots in AEOS but not in agency list
        const missingInAgency = aeosData.filter(aeosSpot =>
            !matchedAeosIds.has(aeosSpot.id || aeosSpot._row_id)
        );

        // Calculate totals
        const missingCost = missingInAeos.reduce((sum, s) => {
            const cost = parseFloat(s[agencyCostCol]) || 0;
            return sum + cost;
        }, 0);

        setComparisonResults({
            summary: {
                agencyTotal: agencyData.length,
                aeosTotal: aeosData.length,
                matched: matched.length,
                discrepancies: discrepancies.length,
                missingInAeos: missingInAeos.length,
                missingInAgency: missingInAgency.length,
                missingCost
            },
            matched,
            missingInAeos,
            missingInAgency,
            discrepancies,
            columns: { agencyChannelCol, agencyDateCol, agencyTimeCol, agencyCostCol, agencyCreativeCol }
        });

        setIsComparing(false);
    }, [agencyData, aeosData]);

    // Export results to CSV
    const exportResults = (type) => {
        if (!comparisonResults) return;

        let data = [];
        let filename = '';

        switch (type) {
            case 'discrepancies':
                data = comparisonResults.discrepancies.map(d => ({
                    date: d.agencySpot[comparisonResults.columns.agencyDateCol],
                    time: d.agencySpot[comparisonResults.columns.agencyTimeCol],
                    channel: d.agencySpot[comparisonResults.columns.agencyChannelCol],
                    issue_type: d.issues.map(i => i.type).join('; '),
                    agency_value: d.issues.map(i => i.agency).join('; '),
                    aeos_value: d.issues.map(i => i.aeos).join('; ')
                }));
                filename = 'discrepancies';
                break;
            case 'missing':
                data = comparisonResults.missingInAeos.map(s => ({
                    date: s[comparisonResults.columns.agencyDateCol],
                    time: s[comparisonResults.columns.agencyTimeCol],
                    channel: s[comparisonResults.columns.agencyChannelCol],
                    cost: s[comparisonResults.columns.agencyCostCol],
                    creative: s[comparisonResults.columns.agencyCreativeCol],
                    status: 'Not Aired'
                }));
                filename = 'missing_spots';
                break;
            default:
                return;
        }

        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reconciliation_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GitCompare className="h-5 w-5" />
                        Agency List vs AEOS Reconciliation
                    </CardTitle>
                    <CardDescription>
                        Compare agency-provided spotlist with actual aired spots from AEOS
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Agency File Upload */}
                        <div className="space-y-2">
                            <Label>1. Upload Agency Spotlist (CSV)</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                <Input
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="agency-file-upload"
                                />
                                <label
                                    htmlFor="agency-file-upload"
                                    className="cursor-pointer flex flex-col items-center gap-2"
                                >
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Click to upload or drag and drop
                                    </span>
                                </label>
                            </div>
                            {agencyFile && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    {agencyFile.name} ({agencyData.length} rows)
                                </div>
                            )}
                            {parseError && (
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    {parseError}
                                </div>
                            )}
                        </div>

                        {/* AEOS Data Info */}
                        <div className="space-y-2">
                            <Label>2. AEOS Data (Current Analysis)</Label>
                            <div className="border rounded-lg p-4 bg-muted/30">
                                {aeosData.length > 0 ? (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span>{aeosData.length} spots loaded from current analysis</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>No AEOS data available. Run an analysis first.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Button
                        className="w-full"
                        onClick={performComparison}
                        disabled={!agencyData.length || !aeosData.length || isComparing}
                    >
                        {isComparing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Comparing...
                            </>
                        ) : (
                            <>
                                <GitCompare className="mr-2 h-4 w-4" />
                                Compare & Reconcile
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Comparison Results */}
            {comparisonResults && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Agency Spots
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {comparisonResults.summary.agencyTotal}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    AEOS Spots
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {comparisonResults.summary.aeosTotal}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Matched
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {comparisonResults.summary.matched}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {((comparisonResults.summary.matched / comparisonResults.summary.agencyTotal) * 100).toFixed(1)}%
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Discrepancies
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                    {comparisonResults.summary.discrepancies}
                                </div>
                                <p className="text-xs text-muted-foreground">Require review</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Missing
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">
                                    {comparisonResults.summary.missingInAeos}
                                </div>
                                <p className="text-xs text-muted-foreground">Didn't air</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Results Tabs */}
                    <Tabs defaultValue="discrepancies">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="discrepancies">
                                Discrepancies ({comparisonResults.summary.discrepancies})
                            </TabsTrigger>
                            <TabsTrigger value="missing-aeos">
                                Missing in AEOS ({comparisonResults.summary.missingInAeos})
                            </TabsTrigger>
                            <TabsTrigger value="missing-agency">
                                Missing in Agency ({comparisonResults.summary.missingInAgency})
                            </TabsTrigger>
                            <TabsTrigger value="matched">
                                Matched ({comparisonResults.summary.matched})
                            </TabsTrigger>
                        </TabsList>

                        {/* Discrepancies */}
                        <TabsContent value="discrepancies">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>Discrepancies Requiring Review</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => exportResults('discrepancies')}
                                            disabled={comparisonResults.discrepancies.length === 0}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Export
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {comparisonResults.discrepancies.length > 0 ? (
                                        <div className="rounded-md border max-h-[400px] overflow-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date/Time</TableHead>
                                                        <TableHead>Channel</TableHead>
                                                        <TableHead>Issue Type</TableHead>
                                                        <TableHead>Agency Value</TableHead>
                                                        <TableHead>AEOS Value</TableHead>
                                                        <TableHead>Difference</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {comparisonResults.discrepancies.slice(0, 50).map((disc, idx) => (
                                                        disc.issues.map((issue, issueIdx) => (
                                                            <TableRow key={`${idx}-${issueIdx}`}>
                                                                <TableCell>
                                                                    {disc.agencySpot[comparisonResults.columns.agencyDateCol]}
                                                                    <br />
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {disc.agencySpot[comparisonResults.columns.agencyTimeCol]}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {disc.agencySpot[comparisonResults.columns.agencyChannelCol]}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant={
                                                                        issue.type === 'price' ? 'destructive' :
                                                                            issue.type === 'duration' ? 'secondary' : 'outline'
                                                                    }>
                                                                        {issue.type}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {issue.type === 'price' ? `€${issue.agency?.toLocaleString()}` : issue.agency}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {issue.type === 'price' ? `€${issue.aeos?.toLocaleString()}` : issue.aeos}
                                                                </TableCell>
                                                                <TableCell className={issue.difference > 0 ? 'text-destructive' : ''}>
                                                                    {issue.type === 'price' ? (
                                                                        <>
                                                                            {issue.difference > 0 ? '+' : ''}€{issue.difference?.toLocaleString()}
                                                                        </>
                                                                    ) : 'Mismatch'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                                            <p>No discrepancies found</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Missing in AEOS */}
                        <TabsContent value="missing-aeos">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>Spots Booked But Didn't Air</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => exportResults('missing')}
                                            disabled={comparisonResults.missingInAeos.length === 0}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Export
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {comparisonResults.missingInAeos.length > 0 ? (
                                        <>
                                            <Alert variant="destructive" className="mb-4">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Billing Issue Detected</AlertTitle>
                                                <AlertDescription>
                                                    {comparisonResults.summary.missingInAeos} spots were billed but didn't air.
                                                    Estimated disputed amount: €{comparisonResults.summary.missingCost.toLocaleString()}
                                                </AlertDescription>
                                            </Alert>
                                            <div className="rounded-md border max-h-[300px] overflow-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Date/Time</TableHead>
                                                            <TableHead>Channel</TableHead>
                                                            <TableHead>Creative</TableHead>
                                                            <TableHead>Cost</TableHead>
                                                            <TableHead>Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {comparisonResults.missingInAeos.slice(0, 50).map((spot, idx) => (
                                                            <TableRow key={idx} className="bg-destructive/5">
                                                                <TableCell>
                                                                    {spot[comparisonResults.columns.agencyDateCol]} {spot[comparisonResults.columns.agencyTimeCol]}
                                                                </TableCell>
                                                                <TableCell>{spot[comparisonResults.columns.agencyChannelCol]}</TableCell>
                                                                <TableCell className="max-w-[200px] truncate">
                                                                    {spot[comparisonResults.columns.agencyCreativeCol]}
                                                                </TableCell>
                                                                <TableCell>€{parseFloat(spot[comparisonResults.columns.agencyCostCol] || 0).toLocaleString()}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="destructive">Not Aired</Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                                            <p>All agency spots matched with AEOS data</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Missing in Agency */}
                        <TabsContent value="missing-agency">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Spots Aired But Not Billed</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {comparisonResults.missingInAgency.length > 0 ? (
                                        <>
                                            <Alert className="mb-4">
                                                <Info className="h-4 w-4" />
                                                <AlertTitle>Potential Bonus Spots</AlertTitle>
                                                <AlertDescription>
                                                    {comparisonResults.summary.missingInAgency} spots aired but weren't in the agency list.
                                                    These may be bonus spots or data entry errors.
                                                </AlertDescription>
                                            </Alert>
                                            <div className="rounded-md border max-h-[300px] overflow-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Date/Time</TableHead>
                                                            <TableHead>Channel</TableHead>
                                                            <TableHead>Creative</TableHead>
                                                            <TableHead>Cost</TableHead>
                                                            <TableHead>Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {comparisonResults.missingInAgency.slice(0, 50).map((spot, idx) => (
                                                            <TableRow key={idx} className="bg-blue-50 dark:bg-blue-950/30">
                                                                <TableCell>
                                                                    {spot.date || spot.timestamp?.split(' ')[0]} {spot.time || spot.timestamp?.split(' ')[1]}
                                                                </TableCell>
                                                                <TableCell>{spot.channel_name || spot.channel_id || spot.Channel}</TableCell>
                                                                <TableCell className="max-w-[200px] truncate">
                                                                    {spot.creative || spot.Creative}
                                                                </TableCell>
                                                                <TableCell>€{(spot.cost_numeric || spot.cost || 0).toLocaleString()}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="secondary">Bonus/Error?</Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                                            <p>No extra AEOS spots found</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Matched */}
                        <TabsContent value="matched">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Successfully Matched Spots</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <AlertTitle>Reconciliation Success</AlertTitle>
                                        <AlertDescription>
                                            {comparisonResults.summary.matched} spots ({
                                                ((comparisonResults.summary.matched / comparisonResults.summary.agencyTotal) * 100).toFixed(1)
                                            }%) matched perfectly with no issues.
                                        </AlertDescription>
                                    </Alert>
                                    <p className="text-sm text-muted-foreground">
                                        Showing first 100 matched spots...
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
};

export default AgencyAeosComparison;
