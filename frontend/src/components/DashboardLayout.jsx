import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Coins, LayoutDashboard, ClipboardList, History, Trophy,
  Wallet, Sun, Moon, LogOut, Menu, X, ChevronDown
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/surveys', label: 'Surveys', icon: ClipboardList },
  { path: '/history', label: 'History', icon: History },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
];

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit'] hidden sm:block">
                SurveyPay
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Balance Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Coins className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {user?.balance?.toLocaleString() || 0}
                </span>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="dashboard-theme-toggle"
                className="rounded-full"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full pl-2 pr-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.picture} />
                      <AvatarFallback className="bg-emerald-500 text-white text-sm">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {user?.name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="sm:hidden">
                    <Coins className="w-4 h-4 mr-2 text-emerald-500" />
                    Balance: {user?.balance?.toLocaleString() || 0} pts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
