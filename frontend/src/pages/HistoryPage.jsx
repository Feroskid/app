import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Coins, Clock, CheckCircle, Loader2, History } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getSurveyHistory();
      setHistory(data);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const totalEarned = history.reduce((sum, item) => sum + item.points_earned, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="history-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              Survey History
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Track all your completed surveys and earnings
            </p>
          </div>
          
          <Card className="glass-card border-slate-200 dark:border-white/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Earned</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                  {totalEarned.toLocaleString()} pts
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* History Table */}
        {loading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : history.length === 0 ? (
          <Card className="glass-card border-slate-200 dark:border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No survey history yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
                Complete some surveys to see your earnings history here
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-slate-200 dark:border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-white/10">
                    <TableHead className="text-slate-600 dark:text-slate-400">Survey</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Provider</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Date</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Status</TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400">Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow
                      key={item.completion_id}
                      className="border-slate-200 dark:border-white/10"
                      data-testid={`history-${item.completion_id}`}
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${
                            item.provider === 'inbrain'
                              ? 'border-indigo-500/50 text-indigo-600 dark:text-indigo-400'
                              : 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.provider === 'inbrain' ? 'Inbrain' : 'CPX'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {format(new Date(item.completed_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          +{item.points_earned} pts
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
