import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { api } from '../lib/api';
import { toast } from 'sonner';
import {
  Coins, TrendingUp, ClipboardCheck, Clock, ArrowRight,
  Wallet, ChevronRight, Loader2
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, surveysData] = await Promise.all([
        api.getStats(),
        api.getSurveys()
      ]);
      setStats(statsData);
      setSurveys(surveysData.slice(0, 3));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSurvey = async (surveyId) => {
    try {
      await api.startSurvey(surveyId);
      navigate('/surveys');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start survey');
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
      title: 'Pending Surveys',
      value: stats?.pending_surveys || '0',
      icon: Clock,
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
            Browse Surveys
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

        {/* Quick Surveys */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="glass-card border-slate-200 dark:border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold font-['Outfit']">
                  Available Surveys
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
                {surveys.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No surveys available right now
                  </p>
                ) : (
                  surveys.map((survey) => (
                    <div
                      key={survey.survey_id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5"
                      data-testid={`survey-${survey.survey_id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-slate-900 dark:text-white truncate">
                            {survey.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              survey.provider === 'inbrain'
                                ? 'border-indigo-500/50 text-indigo-600 dark:text-indigo-400'
                                : 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {survey.provider === 'inbrain' ? 'Inbrain' : 'CPX'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-emerald-500" />
                            {survey.points} pts
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {survey.estimated_time} min
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleStartSurvey(survey.survey_id)}
                        className="rounded-full bg-emerald-500 hover:bg-emerald-600 ml-4"
                        data-testid={`start-survey-${survey.survey_id}`}
                      >
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
              {stats?.recent_completions?.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                  Complete surveys to see your earnings here
                </p>
              ) : (
                stats?.recent_completions?.map((completion, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                        {completion.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(completion.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      +{completion.points_earned}
                    </span>
                  </div>
                ))
              )}
              <Button
                variant="ghost"
                className="w-full text-emerald-600 dark:text-emerald-400"
                onClick={() => navigate('/history')}
              >
                View Full History
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
