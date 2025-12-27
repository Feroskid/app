import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Trophy, Crown, Medal, Loader2, Coins, ClipboardCheck } from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-slate-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-slate-500">
            {rank}
          </span>
        );
    }
  };

  const getRankStyles = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-slate-300/10 to-slate-400/10 border-slate-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/10 to-orange-500/10 border-amber-600/30';
      default:
        return 'border-slate-200 dark:border-white/10';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="leaderboard-page">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
            <Trophy className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Outfit']">
            Top Earners
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            See who's earning the most points this month
          </p>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="glass-card border-slate-200 dark:border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No leaders yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-center">
                Be the first to complete surveys and claim the top spot!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {leaderboard.map((entry) => (
              <Card
                key={entry.user_id}
                className={`glass-card transition-all duration-300 hover:scale-[1.01] ${getRankStyles(entry.rank)} ${
                  entry.user_id === user?.user_id ? 'ring-2 ring-emerald-500' : ''
                }`}
                data-testid={`leaderboard-${entry.rank}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-12 h-12 border-2 border-white/20">
                      <AvatarImage src={entry.picture} />
                      <AvatarFallback className="bg-emerald-500 text-white font-semibold">
                        {entry.name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name & Stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {entry.name}
                        </p>
                        {entry.user_id === user?.user_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <ClipboardCheck className="w-4 h-4" />
                          {entry.surveys_completed} surveys
                        </span>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-5 h-5 text-emerald-500" />
                        <span className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                          {entry.total_earned.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">points</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
