import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Tour step definitions
const TOUR_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Spot Analysis! 👋',
        content: 'This tool helps you detect double-bookings in your advertising spotlists. Double-bookings occur when the same ad runs too close together, reducing campaign effectiveness.',
        target: null, // Modal overlay for welcome
        position: 'center'
    },
    {
        id: 'spotlist',
        title: 'What is a Spotlist?',
        content: 'A spotlist is a schedule of TV advertisement airings. It contains information about when, where, and what ads are broadcast. Upload yours to find potential conflicts.',
        target: '[data-tour="upload-zone"]',
        position: 'right'
    },
    {
        id: 'data-source',
        title: 'Choose Your Data Source',
        content: 'Upload a CSV/Excel file with your spotlist data, or connect directly to AEOS TV Audit to fetch data automatically.',
        target: '[data-tour="data-source-tabs"]',
        position: 'bottom'
    },
    {
        id: 'config',
        title: 'Set Detection Parameters',
        content: 'Configure the time window for detecting conflicts. Ads that air within this window of each other will be flagged as potential double-bookings.',
        target: '[data-tour="config-panel"]',
        position: 'left'
    },
    {
        id: 'dashboard',
        title: 'Your Analysis Dashboard',
        content: 'After running analyses, your results appear here. Track your history, view stats, and quickly access past reports.',
        target: '[data-tour="dashboard-stats"]',
        position: 'bottom'
    },
    {
        id: 'complete',
        title: 'You\'re All Set! 🎉',
        content: 'Start by uploading a spotlist or exploring the demo. You can restart this tour anytime from the sidebar settings.',
        target: null,
        position: 'center'
    }
];

const STORAGE_KEY = 'spot-analysis-onboarding-complete';

export default function OnboardingTour({ onComplete }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);

    // Check if first-time user
    useEffect(() => {
        const hasCompleted = localStorage.getItem(STORAGE_KEY);
        if (!hasCompleted) {
            // Delay to let page render
            const timer = setTimeout(() => setIsActive(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Find target element and get its position
    useEffect(() => {
        if (!isActive) return;

        const step = TOUR_STEPS[currentStep];
        if (!step.target) {
            setTargetRect(null);
            return;
        }

        const findTarget = () => {
            const element = document.querySelector(step.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                setTargetRect({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                });
            } else {
                setTargetRect(null);
            }
        };

        findTarget();
        window.addEventListener('resize', findTarget);
        return () => window.removeEventListener('resize', findTarget);
    }, [isActive, currentStep]);

    const handleNext = useCallback(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            completeTour();
        }
    }, [currentStep]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const completeTour = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsActive(false);
        onComplete?.();
    }, [onComplete]);

    const skipTour = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsActive(false);
    }, []);

    if (!isActive) return null;

    const step = TOUR_STEPS[currentStep];
    const isCenter = step.position === 'center' || !targetRect;

    // Calculate tooltip position
    const getTooltipStyle = () => {
        if (isCenter || !targetRect) {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        }

        const padding = 16;
        const tooltipWidth = 360;
        const tooltipHeight = 200; // approximate

        let top, left;

        switch (step.position) {
            case 'right':
                top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
                left = targetRect.left + targetRect.width + padding;
                break;
            case 'left':
                top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
                left = targetRect.left - tooltipWidth - padding;
                break;
            case 'bottom':
                top = targetRect.top + targetRect.height + padding;
                left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
                break;
            case 'top':
                top = targetRect.top - tooltipHeight - padding;
                left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
                break;
            default:
                top = targetRect.top + targetRect.height + padding;
                left = targetRect.left;
        }

        // Keep within viewport
        top = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, top));
        left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

        return {
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`
        };
    };

    return (
        <>
            {/* Backdrop overlay */}
            <div
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={skipTour}
            />

            {/* Spotlight on target element */}
            {targetRect && (
                <div
                    className="fixed z-[101] ring-4 ring-primary rounded-lg pointer-events-none transition-all duration-300"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)'
                    }}
                />
            )}

            {/* Tooltip */}
            <div
                className="fixed z-[102] w-[360px] bg-card border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                style={getTooltipStyle()}
            >
                {/* Close button */}
                <button
                    onClick={skipTour}
                    className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
                >
                    <X className="size-4 text-muted-foreground" />
                </button>

                {/* Content */}
                <div className="p-6">
                    <h3 className="text-lg font-bold mb-2 pr-6">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.content}
                    </p>
                </div>

                {/* Footer with nav */}
                <div className="px-6 pb-5 flex items-center justify-between">
                    {/* Progress dots */}
                    <div className="flex gap-1.5">
                        {TOUR_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "size-2 rounded-full transition-colors",
                                    i === currentStep ? "bg-primary" : "bg-muted"
                                )}
                            />
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <Button variant="ghost" size="sm" onClick={handlePrev}>
                                <ChevronLeft className="size-4 mr-1" />
                                Back
                            </Button>
                        )}
                        <Button size="sm" onClick={handleNext}>
                            {currentStep === TOUR_STEPS.length - 1 ? (
                                'Get Started'
                            ) : (
                                <>
                                    Next
                                    <ChevronRight className="size-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

// Button to restart the tour
export function RestartTourButton() {
    const [showTour, setShowTour] = useState(false);

    const handleRestart = () => {
        localStorage.removeItem(STORAGE_KEY);
        setShowTour(true);
    };

    return (
        <>
            <Button variant="ghost" size="sm" onClick={handleRestart} className="gap-2">
                <HelpCircle className="size-4" />
                Restart Tour
            </Button>
            {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
        </>
    );
}
