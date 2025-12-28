import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { api } from '../lib/api';
import { toast } from 'sonner';
import {
  Coins, TrendingUp, ClipboardCheck, Clock, ArrowRight,
  Wallet, ChevronRight, Loader2, Play
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, providersData] = await Promise.all([
        api.getStats(),
        api.getSurveyProviders()
      ]);
      setStats(statsData);
      setProviders(providersData.providers || []);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      title: 'Current Balance',
      value: stats?.balance?.toLocaleString() || '0',
      suffix: 'pts',
      icon: Coins,
      color: 'emerald',
      action: { label: 'Withdraw', path: '/wallet' }
    },
    {
      title: 'Total Earned',
      value: stats?.total_earned?.toLocaleString() || '0',
      suffix: 'pts',
      icon: TrendingUp,
      color: 'indigo'
    },
    {
      title: 'Surveys Completed',
      value: stats?.surveys_completed || '0',
      icon: ClipboardCheck,
      color: 'cyan'
    },
    {
      title: 'Est. USD Value',
      value: `$${((stats?.balance || 0) / 1000).toFixed(2)}`,
      icon: Wallet,
      color: 'amber'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="dashboard-page">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Here's what's happening with your earnings
            </p>
          </div>
          <Button
            onClick={() => navigate('/surveys')}
            className="rounded-full bg-emerald-500 hover:bg-emerald-600"
            data-testid="browse-surveys-btn"
          >
            Start Earning
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <Card
              key={i}
              className="glass-card border-slate-200 dark:border-white/10"
              data-testid={`stat-${stat.title.toLowerCase().replace(/\s/g, '-')}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                      {stat.value}
                      {stat.suffix && (
                        <span className="text-base font-normal text-slate-500 ml-1">
                          {stat.suffix}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                  </div>
                </div>
                {stat.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 -ml-2 text-emerald-600 dark:text-emerald-400"
                    onClick={() => navigate(stat.action.path)}
                  >
                    {stat.action.label}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Survey Providers & Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="glass-card border-slate-200 dark:border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold font-['Outfit']">
                  Survey Providers
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/surveys')}
                  className="text-emerald-600 dark:text-emerald-400"
                >
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {providers.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    Loading providers...
                  </p>
                ) : (
                  providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5"
                      data-testid={`provider-${provider.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${provider.color}20` }}
                        >
                          <span 
                            className="text-xl font-bold"
                            style={{ color: provider.color }}
                          >
                            {provider.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {provider.name}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {provider.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/surveys?provider=${provider.id}`)}
                        className="rounded-full"
                        style={{ backgroundColor: provider.color }}
                        data-testid={`start-${provider.id}`}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="glass-card border-slate-200 dark:border-white/10">
            <CardHeader>
              <CardTitle className="text-lg font-semibold font-['Outfit']">
                Recent Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!stats?.recent_completions || stats.recent_completions.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Complete surveys to see your earnings here
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/surveys')}
                  >
                    Start First Survey
                  </Button>
                </div>
              ) : (
                <>
                  {stats.recent_completions.map((completion, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Coins className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
                            {completion.offer_name || completion.provider}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(completion.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        +{completion.points}
                      </span>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    className="w-full text-emerald-600 dark:text-emerald-400"
                    onClick={() => navigate('/history')}
                  >
                    View Full History
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
