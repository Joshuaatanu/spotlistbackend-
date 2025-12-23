import {
    LayoutDashboard,
    FileText,
    Clock,
    Settings,
    LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function Sidebar({ activeTab, setActiveTab }) {
    const menuItems = [
        {
            category: 'MAIN',
            items: [
                { id: 'analyze', label: 'Overview', icon: LayoutDashboard },
                { id: 'results', label: 'Analysis Results', icon: FileText },
                { id: 'history', label: 'History', icon: Clock },
            ]
        },
        {
            category: 'SYSTEM',
            items: [
                { id: 'configuration', label: 'Settings', icon: Settings },
                { id: 'logout', label: 'Logout', icon: LogOut },
            ]
        }
    ];

    return (
        <aside className="w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col h-screen fixed left-0 top-0 p-6 z-50">
            {/* Logo */}
            <div className="font-display text-xl font-extrabold mb-12 pl-3 text-sidebar-foreground tracking-tight">
                Spot Analysis
            </div>

            {/* Navigation */}
            <div className="flex flex-col gap-8 flex-1">
                {menuItems.map((section, idx) => (
                    <div key={idx}>
                        <div className="text-xs font-semibold text-muted-foreground mb-4 pl-3 uppercase tracking-widest">
                            {section.category}
                        </div>
                        <div className="flex flex-col gap-1">
                            {section.items.map((item) => {
                                const ItemIcon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <Button
                                        key={item.id}
                                        variant="ghost"
                                        onClick={() => setActiveTab(item.id)}
                                        className={cn(
                                            "justify-start gap-3 h-10 px-3 w-full relative",
                                            isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                                        )}
                                    >
                                        <ItemIcon className="size-5" />
                                        <span>{item.label}</span>

                                        {isActive && (
                                            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l" />
                                        )}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
