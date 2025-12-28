import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Coins, CheckCircle, XCircle, Loader2, History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getTransactions();
      setTransactions(data);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'credits') return t.reward_type === 'credit';
    if (filter === 'reversals') return t.reward_type === 'reversal' || t.status === 'reversed' || t.status === 'rejected';
    return true;
  });

  const totalEarned = transactions
    .filter(t => t.reward_type === 'credit')
    .reduce((sum, t) => sum + (t.points || 0), 0);

  const totalReversed = transactions
    .filter(t => t.reward_type === 'reversal' || t.status === 'reversed' || t.status === 'rejected')
    .reduce((sum, t) => sum + Math.abs(t.points || 0), 0);

  const getProviderColor = (provider) => {
    switch (provider) {
      case 'inbrain': return 'border-indigo-500/50 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5';
      case 'cpx_research': return 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5';
      case 'admantium': return 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5';
      default: return 'border-slate-500/50 text-slate-600 dark:text-slate-400';
    }
  };

  const getProviderName = (provider) => {
    switch (provider) {
      case 'inbrain': return 'Inbrain';
      case 'cpx_research': return 'CPX Research';
      case 'admantium': return 'Admantium';
      default: return provider;
    }
  };

  const getStatusBadge = (transaction) => {
    if (transaction.status === 'reversed' || transaction.status === 'rejected') {
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0">
          <XCircle className="w-3 h-3 mr-1" />
          Reversed
        </Badge>
      );
    }
    if (transaction.reward_type === 'reversal') {
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0">
          <ArrowDownRight className="w-3 h-3 mr-1" />
          Deduction
        </Badge>
      );
    }
    if (transaction.status === 'disqualified') {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
          <XCircle className="w-3 h-3 mr-1" />
          Disqualified
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
        <CheckCircle className="w-3 h-3 mr-1" />
        Completed
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="history-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              Transaction History
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Track all your survey completions and earnings
            </p>
          </div>
          
          <div className="flex gap-4">
            <Card className="glass-card border-slate-200 dark:border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-500">Total Earned</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {totalEarned.toLocaleString()} pts
                  </p>
                </div>
              </div>
            </Card>
            {totalReversed > 0 && (
              <Card className="glass-card border-slate-200 dark:border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-xs text-slate-500">Reversed</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {totalReversed.toLocaleString()} pts
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
            <TabsTrigger value="credits" data-testid="filter-credits">Credits</TabsTrigger>
            <TabsTrigger value="reversals" data-testid="filter-reversals">Reversals</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* History Table */}
        {loading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card className="glass-card border-slate-200 dark:border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {filter === 'all' ? 'No transactions yet' : `No ${filter} found`}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
                {filter === 'all' 
                  ? 'Complete surveys to see your transaction history here'
                  : 'Try a different filter to see more transactions'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-slate-200 dark:border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-white/10">
                    <TableHead className="text-slate-600 dark:text-slate-400">Date</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Provider</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Details</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Status</TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t) => (
                    <TableRow
                      key={t.transaction_id}
                      className="border-slate-200 dark:border-white/10"
                      data-testid={`transaction-${t.transaction_id}`}
                    >
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {format(new Date(t.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getProviderColor(t.provider)}>
                          {getProviderName(t.provider)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-900 dark:text-white">
                        <div>
                          <p className="font-medium truncate max-w-[200px]">
                            {t.offer_name || t.type || 'Survey Completion'}
                          </p>
                          {t.offer_id && (
                            <p className="text-xs text-slate-500 font-mono">
                              ID: {t.offer_id}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(t)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          t.points > 0 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {t.points > 0 ? '+' : ''}{t.points} pts
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
