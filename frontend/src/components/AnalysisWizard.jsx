import { useState, useMemo } from 'react';
import { Upload, Database, Settings, ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import FileUpload from './FileUpload';
import AeosDataFetch from './AeosDataFetchOptimized';
import ConfigPanel from './ConfigPanel';

const STEPS = [
    { id: 1, title: 'Select Data', description: 'Choose your data source' },
    { id: 2, title: 'Configure', description: 'Set analysis options' },
    { id: 3, title: 'Analyze', description: 'Run the analysis' }
];

export default function AnalysisWizard({
    // Data source state
    dataSource,
    setDataSource,
    file,
    setFile,
    // AEOS state
    companyName,
    setCompanyName,
    companyId,
    setCompanyId,
    brandIds,
    setBrandIds,
    productIds,
    setProductIds,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    channelFilter,
    setChannelFilter,
    reportType,
    setReportType,
    filters,
    setFilters,
    topTenSubtype,
    setTopTenSubtype,
    // Config state
    config,
    setConfig,
    // Analysis handlers
    onAnalyze,
    onAnalyzeAeos,
    // Status
    loading,
    error,
    progress,
    collectedData,
    onAnalyzeCollectedData,
    onDownloadRawData
}) {
    const [currentStep, setCurrentStep] = useState(1);

    // Determine if user can proceed to next step
    const canProceedToStep2 = useMemo(() => {
        if (dataSource === 'file') {
            return !!file;
        } else {
            // AEOS requires company (for some reports) and date range
            const requiresCompany = ['spotlist', 'deepAnalysis', 'daypartAnalysis'].includes(reportType);
            return ((!requiresCompany || companyName) && dateFrom && dateTo) || collectedData;
        }
    }, [dataSource, file, companyName, dateFrom, dateTo, reportType, collectedData]);

    const canProceedToStep3 = useMemo(() => {
        // Must have data ready and configuration set
        return canProceedToStep2 && config.time_window_minutes > 0;
    }, [canProceedToStep2, config.time_window_minutes]);

    const handleNext = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleRunAnalysis = () => {
        if (dataSource === 'file') {
            onAnalyze();
        } else if (collectedData) {
            onAnalyzeCollectedData();
        } else {
            onAnalyzeAeos();
        }
    };

    return (
        <div className="animate-in max-w-4xl mx-auto">
            {/* Step Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
                    <div
                        className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    />

                    {STEPS.map((step) => (
                        <div
                            key={step.id}
                            className="relative z-10 flex flex-col items-center"
                        >
                            <div className={cn(
                                "size-10 rounded-full flex items-center justify-center font-semibold transition-all",
                                currentStep > step.id
                                    ? "bg-primary text-primary-foreground"
                                    : currentStep === step.id
                                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                                        : "bg-muted text-muted-foreground"
                            )}>
                                {currentStep > step.id ? (
                                    <Check className="size-5" />
                                ) : (
                                    step.id
                                )}
                            </div>
                            <div className="mt-2 text-center">
                                <div className={cn(
                                    "text-sm font-semibold",
                                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {step.title}
                                </div>
                                <div className="text-xs text-muted-foreground hidden sm:block">
                                    {step.description}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <Card className="mb-6">
                {/* Step 1: Data Source */}
                {currentStep === 1 && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {dataSource === 'file' ? (
                                    <Upload className="size-5" />
                                ) : (
                                    <Database className="size-5" />
                                )}
                                Select Your Data Source
                            </CardTitle>
                            <CardDescription>
                                Upload a spotlist file or fetch data directly from AEOS TV Audit
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs
                                value={dataSource}
                                onValueChange={(v) => { setDataSource(v); }}
                                className="mb-6"
                                data-tour="data-source-tabs"
                            >
                                <TabsList className="grid grid-cols-2 w-full max-w-md">
                                    <TabsTrigger value="file">File Upload</TabsTrigger>
                                    <TabsTrigger value="aeos">AEOS TV Audit</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div data-tour="upload-zone">
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
                            </div>

                            {error && (
                                <Alert variant="destructive" className="mt-4">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </>
                )}

                {/* Step 2: Configuration */}
                {currentStep === 2 && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="size-5" />
                                Configure Analysis
                            </CardTitle>
                            <CardDescription>
                                Set your detection parameters for double-booking analysis
                            </CardDescription>
                        </CardHeader>
                        <CardContent data-tour="config-panel">
                            <ConfigPanel config={config} setConfig={setConfig} />
                        </CardContent>
                    </>
                )}

                {/* Step 3: Analyze */}
                {currentStep === 3 && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {loading ? (
                                    <Loader2 className="size-5 animate-spin" />
                                ) : (
                                    <Check className="size-5" />
                                )}
                                {loading ? 'Analyzing...' : 'Ready to Analyze'}
                            </CardTitle>
                            <CardDescription>
                                {loading
                                    ? 'Please wait while we process your data'
                                    : 'Review your settings and start the analysis'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Summary of selections */}
                            <div className="space-y-4 mb-6">
                                <div className="p-4 bg-muted rounded-lg">
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Data Source</div>
                                    <div className="font-semibold">
                                        {dataSource === 'file' ? (
                                            <>📁 {file?.name || 'No file selected'}</>
                                        ) : (
                                            <>🔗 AEOS: {companyName || 'All companies'} ({dateFrom} to {dateTo})</>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Time Window</div>
                                    <div className="font-semibold">
                                        ⏱️ {config.time_window_minutes} minutes
                                    </div>
                                </div>
                            </div>

                            {/* Progress during analysis */}
                            {loading && progress && (
                                <div className="p-4 bg-muted rounded-lg mb-4">
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

                            {/* Collected data options */}
                            {collectedData && !loading && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-lg mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-emerald-600">✓</span>
                                        <span className="font-semibold">Data collected: {collectedData.metadata?.total_spots} spots</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={onDownloadRawData}>
                                            Download Raw Data
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* Run Analysis Button */}
                            {!loading && (
                                <Button
                                    onClick={handleRunAnalysis}
                                    size="lg"
                                    className="w-full"
                                    disabled={!canProceedToStep3}
                                >
                                    🚀 Run Analysis
                                </Button>
                            )}
                        </CardContent>
                    </>
                )}
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1 || loading}
                >
                    <ChevronLeft className="size-4 mr-1" />
                    Back
                </Button>

                {currentStep < 3 && (
                    <Button
                        onClick={handleNext}
                        disabled={
                            (currentStep === 1 && !canProceedToStep2) ||
                            (currentStep === 2 && !canProceedToStep3) ||
                            loading
                        }
                    >
                        Next
                        <ChevronRight className="size-4 ml-1" />
                    </Button>
                )}
            </div>
        </div>
    );
}
