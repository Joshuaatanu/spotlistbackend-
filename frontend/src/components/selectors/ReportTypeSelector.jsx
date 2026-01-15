import { useState } from 'react';
import { BarChart3, TrendingUp, Clock, FileText, Activity, ChevronDown, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const REPORT_TYPES = {
  spotlist: {
    id: 'spotlist',
    name: 'Spotlist Report',
    description: 'Detailed spotlist with XRP, SPEND, and other metrics',
    icon: FileText,
    default: true
  },
  competitor: {
    id: 'competitor',
    name: 'Competitor Analysis',
    description: 'Compare TV advertising between brands (e.g., eBay vs Amazon)',
    icon: Users
  },
  topTen: {
    id: 'topTen',
    name: 'Top Ten Report',
    description: 'Top 10 advertisers/brands/products by metric',
    icon: BarChart3
  },
  reachFrequency: {
    id: 'reachFrequency',
    name: 'Reach & Frequency',
    description: 'Reach and frequency analysis',
    icon: TrendingUp
  },
  daypartAnalysis: {
    id: 'daypartAnalysis',
    name: 'Daypart Analysis',
    description: 'Performance analysis by time of day',
    icon: Clock
  },
  deepAnalysis: {
    id: 'deepAnalysis',
    name: 'Deep Analysis (KPIs)',
    description: 'Channel/Event analysis with KPIs',
    icon: Activity
  }
};

export default function ReportTypeSelector({ reportType, setReportType }) {
  const [expanded, setExpanded] = useState(false);

  const selectedType = REPORT_TYPES[reportType] || REPORT_TYPES.spotlist;
  const Icon = selectedType.icon;

  return (
    <div>
      <Label className="flex items-center gap-2 mb-2">
        <Icon className="size-4" />
        Report Type
      </Label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full p-3 border rounded-lg bg-card text-foreground cursor-pointer",
            "flex items-center justify-between text-left",
            "hover:border-primary/50 transition-colors"
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="size-5 text-primary" />
            <div>
              <div className="font-medium">{selectedType.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {selectedType.description}
              </div>
            </div>
          </div>
          <ChevronDown className={cn(
            "size-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )} />
        </button>

        {expanded && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {Object.values(REPORT_TYPES).map((type) => {
              const TypeIcon = type.icon;
              const isSelected = reportType === type.id;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setReportType(type.id);
                    setExpanded(false);
                  }}
                  className={cn(
                    "w-full p-3 border-b last:border-b-0 flex items-start gap-3 text-left transition-colors",
                    isSelected ? "bg-primary/10" : "hover:bg-muted"
                  )}
                >
                  <TypeIcon className={cn(
                    "size-5 mt-0.5 shrink-0",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="flex-1">
                    <div className={cn(
                      "text-sm",
                      isSelected && "font-semibold"
                    )}>
                      {type.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {type.description}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="size-5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Backdrop to close dropdown */}
      {expanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setExpanded(false)}
        />
      )}
    </div>
  );
}

