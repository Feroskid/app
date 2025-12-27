import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Coins, Clock, BarChart3, Filter, Loader2, Play,
  CheckCircle, ArrowRight
} from 'lucide-react';

export default function SurveysPage() {
  const { refreshUser } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [surveyProgress, setSurveyProgress] = useState(0);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, [filter]);

  const loadSurveys = async () => {
    try {
      const provider = filter === 'all' ? null : filter;
      const data = await api.getSurveys(provider);
      setSurveys(data);
    } catch (error) {
      toast.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSurvey = async (survey) => {
    try {
      await api.startSurvey(survey.survey_id);
      setActiveSurvey(survey);
      setSurveyProgress(0);
      
      // Simulate survey progress
      const interval = setInterval(() => {
        setSurveyProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start survey');
    }
  };

  const handleCompleteSurvey = async () => {
    if (!activeSurvey) return;
    
    setCompleting(true);
    try {
      const result = await api.completeSurvey(activeSurvey.survey_id);
      toast.success(`Earned ${result.points_earned} points!`);
      setActiveSurvey(null);
      setSurveyProgress(0);
      await refreshUser();
      loadSurveys();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete survey');
    } finally {
      setCompleting(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Hard': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="surveys-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              Available Surveys
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Complete surveys to earn points
            </p>
          </div>
          
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
              <TabsTrigger value="inbrain" data-testid="filter-inbrain">Inbrain</TabsTrigger>
              <TabsTrigger value="cpx_research" data-testid="filter-cpx">CPX</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Surveys Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : surveys.length === 0 ? (
          <Card className="glass-card border-slate-200 dark:border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No surveys available
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
                All surveys have been completed or none are available at the moment. Check back later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveys.map((survey) => (
              <Card
                key={survey.survey_id}
                className="glass-card border-slate-200 dark:border-white/10 hover:scale-[1.02] transition-transform duration-300"
                data-testid={`survey-card-${survey.survey_id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Badge
                      variant="outline"
                      className={`${
                        survey.provider === 'inbrain'
                          ? 'border-indigo-500/50 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5'
                          : 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                      }`}
                    >
                      {survey.provider === 'inbrain' ? 'Inbrain' : 'CPX Research'}
                    </Badge>
                    <Badge variant="outline" className={getDifficultyColor(survey.difficulty)}>
                      {survey.difficulty}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white font-['Outfit'] mb-2">
                    {survey.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {survey.description}
                  </p>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {survey.points} pts
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{survey.estimated_time} min</span>
                    </div>
                  </div>

                  <Badge variant="secondary" className="mb-4">
                    {survey.category}
                  </Badge>

                  <Button
                    className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => handleStartSurvey(survey)}
                    disabled={survey.status === 'in_progress'}
                    data-testid={`start-${survey.survey_id}`}
                  >
                    {survey.status === 'in_progress' ? (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        In Progress
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Survey
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Survey Dialog */}
      <Dialog open={!!activeSurvey} onOpenChange={() => setActiveSurvey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">{activeSurvey?.title}</DialogTitle>
            <DialogDescription>
              Complete this survey to earn {activeSurvey?.points} points
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {activeSurvey?.description}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                Survey Progress (Simulated)
              </p>
              <Progress value={surveyProgress} className="h-3" />
              <p className="text-sm text-slate-500 mt-2">{surveyProgress}% Complete</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActiveSurvey(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteSurvey}
              disabled={surveyProgress < 100 || completing}
              className="bg-emerald-500 hover:bg-emerald-600"
              data-testid="complete-survey-btn"
            >
              {completing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete & Earn {activeSurvey?.points} pts
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
