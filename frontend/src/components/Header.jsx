import { Search, Bell, ChevronDown, Sun, Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from './ThemeProvider';

export default function Header() {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="h-20 bg-card border-b flex items-center justify-between px-10 sticky top-0 z-40">
            {/* Search */}
            <div className="relative w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search reports or spotlists..."
                    className="pl-11 rounded-full bg-background"
                />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-6">
                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {theme === 'dark' ? (
                        <Sun className="size-5 text-muted-foreground" />
                    ) : (
                        <Moon className="size-5 text-muted-foreground" />
                    )}
                </Button>

                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="size-5 text-muted-foreground" />
                    <div className="absolute -top-0.5 right-0.5 size-2 bg-foreground rounded-full ring-2 ring-card" />
                </Button>

                <Button variant="ghost" size="sm" className="gap-1 text-sm font-semibold">
                    EN <ChevronDown className="size-4" />
                </Button>

                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="text-right">
                        <div className="text-sm font-semibold">joshua</div>
                        <div className="text-xs text-muted-foreground">Super Admin</div>
                    </div>
                    <div className="size-10 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm font-display">
                        DC
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground" />
                </div>
            </div>
        </header>
    );
}
