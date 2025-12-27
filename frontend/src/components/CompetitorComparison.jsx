import { useState, useMemo } from 'react';
import { Users, DollarSign, Layers, TrendingUp, Tv, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Vibrant brand colors for comparison
const BRAND_COLORS = [
    'hsl(262, 83%, 58%)', // Purple
    'hsl(173, 80%, 40%)', // Teal
    'hsl(38, 92%, 50%)',  // Amber
    'hsl(346, 77%, 50%)', // Rose
    'hsl(221, 83%, 53%)', // Blue
];

export default function CompetitorComparison({ data, fieldMap }) {
    const [selectedBrands, setSelectedBrands] = useState([]);

    // Extract unique brands from data
    const availableBrands = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        const brands = [...new Set(data.map(d => d.Brand).filter(Boolean))].sort();
        return brands;
    }, [data]);

    // Toggle brand selection
    const toggleBrand = (brand) => {
        setSelectedBrands(prev => {
            if (prev.includes(brand)) {
                return prev.filter(b => b !== brand);
            }
            if (prev.length >= 5) return prev; // Max 5 brands
            return [...prev, brand];
        });
    };

    // Calculate metrics per brand
    const brandMetrics = useMemo(() => {
        if (!data || selectedBrands.length === 0) return {};

        const metrics = {};
        selectedBrands.forEach(brand => {
            const brandData = data.filter(d => d.Brand === brand);
            const channels = [...new Set(brandData.map(d =>
                d[fieldMap?.program_column] || d.program_original || d.Channel
            ).filter(Boolean))];
            const dayparts = [...new Set(brandData.map(d =>
                d[fieldMap?.daypart_column] || d['Airing daypart']
            ).filter(Boolean))];

            metrics[brand] = {
                totalSpend: brandData.reduce((sum, d) => sum + (d.cost_numeric || d[fieldMap?.cost_column] || d.Spend || 0), 0),
                totalSpots: brandData.length,
                doubleSpots: brandData.filter(d => d.is_double).length,
                channels,
                channelCount: channels.length,
                dayparts,
                avgSpotCost: brandData.length > 0
                    ? brandData.reduce((sum, d) => sum + (d.cost_numeric || 0), 0) / brandData.length
                    : 0,
            };
        });

        return metrics;
    }, [data, selectedBrands, fieldMap]);

    // Channel overlap analysis
    const channelAnalysis = useMemo(() => {
        if (selectedBrands.length < 2) return null;

        const allChannels = new Set();
        const channelsByBrand = {};

        selectedBrands.forEach(brand => {
            channelsByBrand[brand] = new Set(brandMetrics[brand]?.channels || []);
            brandMetrics[brand]?.channels?.forEach(ch => allChannels.add(ch));
        });

        // Find shared channels (appear in all selected brands)
        const sharedChannels = [...allChannels].filter(channel =>
            selectedBrands.every(brand => channelsByBrand[brand].has(channel))
        );

        // Find unique channels per brand
        const uniqueChannels = {};
        selectedBrands.forEach(brand => {
            uniqueChannels[brand] = [...channelsByBrand[brand]].filter(channel =>
                !selectedBrands.some(other => other !== brand && channelsByBrand[other].has(channel))
            );
        });

        return { sharedChannels, uniqueChannels, totalChannels: allChannels.size };
    }, [selectedBrands, brandMetrics]);

    // Chart data for spend comparison by channel
    const spendByChannelData = useMemo(() => {
        if (!data || selectedBrands.length === 0) return [];

        const channelSpend = {};

        selectedBrands.forEach(brand => {
            const brandData = data.filter(d => d.Brand === brand);
            brandData.forEach(d => {
                const channel = d[fieldMap?.program_column] || d.program_original || d.Channel || 'Unknown';
                const spend = d.cost_numeric || d[fieldMap?.cost_column] || d.Spend || 0;

                if (!channelSpend[channel]) {
                    channelSpend[channel] = { channel };
                }
                channelSpend[channel][brand] = (channelSpend[channel][brand] || 0) + spend;
            });
        });

        // Sort by total spend and take top 10
        return Object.values(channelSpend)
            .map(item => ({
                ...item,
                total: selectedBrands.reduce((sum, brand) => sum + (item[brand] || 0), 0)
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }, [data, selectedBrands, fieldMap]);

    // Empty state
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Users className="size-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No data available for comparison</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Brand Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="size-5" />
                        Select Brands to Compare
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {availableBrands.map((brand, index) => {
                            const isSelected = selectedBrands.includes(brand);
                            const colorIndex = selectedBrands.indexOf(brand);
                            return (
                                <button
                                    key={brand}
                                    onClick={() => toggleBrand(brand)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200",
                                        isSelected
                                            ? "text-white shadow-lg"
                                            : "bg-muted border-transparent hover:border-primary/30"
                                    )}
                                    style={isSelected ? {
                                        backgroundColor: BRAND_COLORS[colorIndex % BRAND_COLORS.length],
                                        borderColor: BRAND_COLORS[colorIndex % BRAND_COLORS.length]
                                    } : {}}
                                >
                                    {isSelected && <Check className="size-4 inline mr-1" />}
                                    {brand}
                                </button>
                            );
                        })}
                    </div>
                    {selectedBrands.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-3">
                            {selectedBrands.length} brand{selectedBrands.length !== 1 ? 's' : ''} selected (max 5)
                        </p>
                    )}
                    {availableBrands.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                            No brands found in the current dataset. Make sure your data includes brand information.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Comparison Content */}
            {selectedBrands.length >= 2 ? (
                <>
                    {/* Side-by-Side Metrics */}
                    <div className={cn(
                        "grid gap-4",
                        selectedBrands.length === 2 ? "grid-cols-2" :
                            selectedBrands.length === 3 ? "grid-cols-3" :
                                selectedBrands.length === 4 ? "grid-cols-4" : "grid-cols-5"
                    )}>
                        {selectedBrands.map((brand, index) => {
                            const metrics = brandMetrics[brand];
                            const color = BRAND_COLORS[index % BRAND_COLORS.length];
                            return (
                                <Card key={brand} className="overflow-hidden">
                                    <div
                                        className="h-2"
                                        style={{ backgroundColor: color }}
                                    />
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg truncate">{brand}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Spend</p>
                                            <p className="text-2xl font-bold tabular-nums">
                                                €{metrics?.totalSpend?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Spots</p>
                                                <p className="text-lg font-semibold tabular-nums">{metrics?.totalSpots?.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Channels</p>
                                                <p className="text-lg font-semibold tabular-nums">{metrics?.channelCount}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Spot Cost</p>
                                            <p className="text-lg font-semibold tabular-nums">
                                                €{metrics?.avgSpotCost?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        {metrics?.doubleSpots > 0 && (
                                            <Badge variant="destructive" className="w-full justify-center">
                                                {metrics.doubleSpots} double bookings
                                            </Badge>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Channel Overlap Analysis */}
                    {channelAnalysis && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Tv className="size-5" />
                                    Channel Overlap Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Shared Channels */}
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                            <Check className="size-4 text-green-500" />
                                            Shared Channels ({channelAnalysis.sharedChannels.length} of {channelAnalysis.totalChannels})
                                        </p>
                                        {channelAnalysis.sharedChannels.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {channelAnalysis.sharedChannels.map(channel => (
                                                    <Badge key={channel} variant="secondary">{channel}</Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No shared channels</p>
                                        )}
                                    </div>

                                    {/* Unique Channels per Brand */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {selectedBrands.map((brand, index) => (
                                            <div key={brand} className="p-3 rounded-lg border">
                                                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                    <span
                                                        className="size-3 rounded-full"
                                                        style={{ backgroundColor: BRAND_COLORS[index] }}
                                                    />
                                                    {brand} Only
                                                </p>
                                                {channelAnalysis.uniqueChannels[brand]?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {channelAnalysis.uniqueChannels[brand].slice(0, 5).map(channel => (
                                                            <Badge key={channel} variant="outline" className="text-xs">{channel}</Badge>
                                                        ))}
                                                        {channelAnalysis.uniqueChannels[brand].length > 5 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{channelAnalysis.uniqueChannels[brand].length - 5} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">None</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Spend by Channel Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="size-5" />
                                Spend Comparison by Channel
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={spendByChannelData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="channel"
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                        tick={{ fill: 'currentColor', fontSize: 11 }}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `€${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                                        tick={{ fill: 'currentColor', fontSize: 11 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            borderColor: 'hsl(var(--border))',
                                            borderRadius: '8px',
                                            color: 'hsl(var(--card-foreground))',
                                        }}
                                        formatter={(value) => [`€${value.toLocaleString()}`, '']}
                                    />
                                    <Legend />
                                    {selectedBrands.map((brand, index) => (
                                        <Bar
                                            key={brand}
                                            dataKey={brand}
                                            fill={BRAND_COLORS[index % BRAND_COLORS.length]}
                                            radius={[4, 4, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </>
            ) : selectedBrands.length === 1 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="size-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Select at least one more brand to compare</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="size-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Select 2 or more brands above to start comparing</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
