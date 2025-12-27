import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Wallet, Coins, TrendingUp, ArrowDownToLine, Clock,
  CheckCircle, XCircle, Loader2, CreditCard, Banknote, Bitcoin
} from 'lucide-react';

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    method: '',
    account_details: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [walletData, withdrawalsData] = await Promise.all([
        api.getWallet(),
        api.getWithdrawals()
      ]);
      setWallet(walletData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawForm.amount || !withdrawForm.method || !withdrawForm.account_details) {
      toast.error('Please fill all fields');
      return;
    }

    const amount = parseInt(withdrawForm.amount);
    if (isNaN(amount) || amount < 500) {
      toast.error('Minimum withdrawal is 500 points');
      return;
    }
    if (amount > (wallet?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    setWithdrawing(true);
    try {
      await api.requestWithdrawal(amount, withdrawForm.method, withdrawForm.account_details);
      toast.success('Withdrawal request submitted!');
      setWithdrawDialogOpen(false);
      setWithdrawForm({ amount: '', method: '', account_details: '' });
      await refreshUser();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'paypal':
        return <CreditCard className="w-4 h-4" />;
      case 'bank':
        return <Banknote className="w-4 h-4" />;
      case 'crypto':
        return <Bitcoin className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="wallet-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              Wallet
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage your earnings and withdrawals
            </p>
          </div>
          
          <Button
            onClick={() => setWithdrawDialogOpen(true)}
            className="rounded-full bg-emerald-500 hover:bg-emerald-600"
            disabled={!wallet || wallet.balance < 500}
            data-testid="withdraw-btn"
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Balance Cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="glass-card border-slate-200 dark:border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Available Balance</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                        {wallet?.balance?.toLocaleString() || 0}
                        <span className="text-base font-normal text-slate-500 ml-1">pts</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-slate-200 dark:border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Earned</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                        {wallet?.total_earned?.toLocaleString() || 0}
                        <span className="text-base font-normal text-slate-500 ml-1">pts</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-indigo-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-slate-200 dark:border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Pending Withdrawal</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                        {wallet?.pending_withdrawals?.toLocaleString() || 0}
                        <span className="text-base font-normal text-slate-500 ml-1">pts</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Info */}
            <Card className="glass-card border-slate-200 dark:border-white/10">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white font-['Outfit']">
                      Points Conversion Rate
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      1000 points = $1.00 USD
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Your balance is worth</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      ${((wallet?.balance || 0) / 1000).toFixed(2)} USD
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal History */}
            <Card className="glass-card border-slate-200 dark:border-white/10">
              <CardHeader>
                <CardTitle className="font-['Outfit']">Withdrawal History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {withdrawals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">No withdrawals yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 dark:border-white/10">
                        <TableHead className="text-slate-600 dark:text-slate-400">Date</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Method</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Account</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Status</TableHead>
                        <TableHead className="text-right text-slate-600 dark:text-slate-400">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((w) => (
                        <TableRow
                          key={w.withdrawal_id}
                          className="border-slate-200 dark:border-white/10"
                          data-testid={`withdrawal-${w.withdrawal_id}`}
                        >
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            {format(new Date(w.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                              {getMethodIcon(w.method)}
                              <span className="capitalize">{w.method}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-sm truncate max-w-[150px]">
                            {w.account_details}
                          </TableCell>
                          <TableCell>{getStatusBadge(w.status)}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                            {w.amount.toLocaleString()} pts
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">Request Withdrawal</DialogTitle>
            <DialogDescription>
              Minimum withdrawal: 500 points. Available: {wallet?.balance?.toLocaleString() || 0} pts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (points)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="500"
                min="500"
                max={wallet?.balance || 0}
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                className="h-12"
                data-testid="withdraw-amount-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={withdrawForm.method}
                onValueChange={(value) => setWithdrawForm({ ...withdrawForm, method: value })}
              >
                <SelectTrigger className="h-12" data-testid="withdraw-method-select">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      PayPal
                    </div>
                  </SelectItem>
                  <SelectItem value="bank">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Bank Transfer
                    </div>
                  </SelectItem>
                  <SelectItem value="crypto">
                    <div className="flex items-center gap-2">
                      <Bitcoin className="w-4 h-4" />
                      Crypto (USDT)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Account Details</Label>
              <Input
                id="account"
                placeholder={
                  withdrawForm.method === 'paypal' ? 'email@example.com' :
                  withdrawForm.method === 'bank' ? 'Account number' :
                  withdrawForm.method === 'crypto' ? 'Wallet address' :
                  'Enter details'
                }
                value={withdrawForm.account_details}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, account_details: e.target.value })}
                className="h-12"
                data-testid="withdraw-account-input"
              />
            </div>

            {withdrawForm.amount && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">You'll receive</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${(parseInt(withdrawForm.amount) / 1000).toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="bg-emerald-500 hover:bg-emerald-600"
              data-testid="confirm-withdraw-btn"
            >
              {withdrawing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
