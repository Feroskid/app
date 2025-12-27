import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Sun, Moon, ArrowRight, Coins, ClipboardCheck, Trophy, 
  Wallet, Zap, Shield, ChevronRight 
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      icon: ClipboardCheck,
      title: 'Easy Surveys',
      description: 'Complete quick surveys from top providers like Inbrain and CPX Research'
    },
    {
      icon: Coins,
      title: 'Earn Points',
      description: 'Get rewarded instantly with points for every completed survey'
    },
    {
      icon: Wallet,
      title: 'Quick Withdrawals',
      description: 'Cash out your earnings via PayPal, bank transfer, or crypto'
    },
    {
      icon: Zap,
      title: 'Instant Credits',
      description: 'Your balance updates automatically the moment you finish a survey'
    },
    {
      icon: Trophy,
      title: 'Leaderboard',
      description: 'Compete with others and climb the ranks to earn bonus rewards'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is protected with industry-standard security'
    }
  ];

  const stats = [
    { value: '50K+', label: 'Active Users' },
    { value: '$2M+', label: 'Paid Out' },
    { value: '100+', label: 'Surveys Daily' },
    { value: '4.8', label: 'User Rating' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                SurveyPay
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="theme-toggle"
                className="rounded-full"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                data-testid="login-btn"
                className="hidden sm:flex"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/register')}
                data-testid="get-started-btn"
                className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:px-12 lg:px-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-indigo-500/10 to-transparent dark:from-emerald-500/5 dark:via-indigo-500/5" />
        <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/20 blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-0 -left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/20 blur-[80px] animate-pulse-glow" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <Zap className="w-4 h-4" />
                Earn up to $50/day
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white font-['Outfit'] tracking-tight leading-tight">
                Turn Your
                <span className="text-gradient"> Opinions </span>
                Into Real Cash
              </h1>
              
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                Join thousands earning money by sharing their thoughts. Complete surveys from 
                top research companies and get paid instantly.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  data-testid="hero-cta"
                  className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-lg px-8 py-6"
                >
                  Start Earning Now
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="rounded-full text-lg px-8 py-6"
                >
                  I have an account
                </Button>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl glow-emerald">
                <img
                  src="https://images.unsplash.com/photo-1673093774005-a5ee94ed98c4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwyfHxoYXBweSUyMHBlcnNvbiUyMGhvbGRpbmclMjBwaG9uZSUyMHdpbm5pbmd8ZW58MHx8fHwxNzY2ODQ5Nzk5fDA&ixlib=rb-4.1.0&q=85"
                  alt="Happy user earning rewards"
                  className="w-full h-[500px] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 glass-card rounded-xl p-4 animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Points Earned</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">+2,500</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 md:px-12 lg:px-24 bg-slate-100 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-emerald-500 font-['Outfit']">
                  {stat.value}
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              Why Choose SurveyPay?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
              We partner with the best survey providers to bring you the highest-paying opportunities
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white font-['Outfit'] mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers Section */}
      <section className="py-20 px-6 md:px-12 lg:px-24 bg-slate-100 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white font-['Outfit'] mb-4">
            Trusted Survey Providers
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
            We work with industry-leading research companies to bring you quality surveys
          </p>
          
          <div className="flex flex-wrap justify-center gap-8">
            <div className="glass-card rounded-2xl px-12 py-8">
              <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-['Outfit']">
                Inbrain
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Premium Surveys</p>
            </div>
            <div className="glass-card rounded-2xl px-12 py-8">
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-['Outfit']">
                CPX Research
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Global Research</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white font-['Outfit'] mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
            Join our community of earners today. Sign up takes less than a minute.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            data-testid="footer-cta"
            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-lg px-12 py-6"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 md:px-12 lg:px-24 border-t border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">SurveyPay</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            © 2025 SurveyPay. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
