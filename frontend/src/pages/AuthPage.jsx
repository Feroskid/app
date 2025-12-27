import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { Coins, Sun, Moon, ArrowLeft, Mail, Lock, User, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        if (!formData.name.trim()) {
          toast.error('Please enter your name');
          setLoading(false);
          return;
        }
        await register(formData.email, formData.password, formData.name);
        toast.success('Account created successfully!');
      }
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="auth-theme-toggle"
              className="rounded-full"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              SurveyPay
            </span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-['Outfit'] mb-2">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            {isLogin 
              ? 'Sign in to continue earning with surveys' 
              : 'Start earning money by completing surveys'}
          </p>

          {/* Google Login */}
          <Button
            variant="outline"
            className="w-full h-12 mb-6 rounded-xl"
            onClick={handleGoogleLogin}
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-50 dark:bg-slate-950 text-slate-500">
                or continue with email
              </span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 pl-10 rounded-xl"
                    data-testid="name-input"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 pl-10 rounded-xl"
                  data-testid="email-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12 pl-10 rounded-xl"
                  data-testid="password-input"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-slate-600 dark:text-slate-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => navigate(isLogin ? '/register' : '/login')}
              className="text-emerald-500 hover:text-emerald-600 font-medium"
              data-testid="switch-auth-mode"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:flex flex-1 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-indigo-500/20 to-transparent" />
        <img
          src="https://images.unsplash.com/photo-1670408378467-b8d8b461d49d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHBlcnNvbiUyMGhvbGRpbmclMjBwaG9uZSUyMHdpbm5pbmd8ZW58MHx8fHwxNzY2ODQ5Nzk5fDA&ixlib=rb-4.1.0&q=85"
          alt="User earning rewards"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute bottom-12 left-12 right-12">
          <div className="glass-card rounded-2xl p-6">
            <p className="text-lg text-white font-medium mb-2">
              "I've earned over $500 this month just by sharing my opinions!"
            </p>
            <p className="text-slate-400 text-sm">
              - Sarah M., Premium Member
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
