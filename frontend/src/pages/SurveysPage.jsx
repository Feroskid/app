import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Coins, Clock, Loader2, ExternalLink, RefreshCw, Maximize2, X
} from 'lucide-react';

export default function SurveysPage() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProvider, setActiveProvider] = useState(searchParams.get('provider') || 'all');
  const [fullscreenProvider, setFullscreenProvider] = useState(null);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (activeProvider !== 'all') {
      setSearchParams({ provider: activeProvider });
    } else {
      setSearchParams({});
    }
  }, [activeProvider, setSearchParams]);

  const loadProviders = async () => {
    try {
      const data = await api.getSurveyProviders();
      setProviders(data.providers);
    } catch (error) {
      toast.error('Failed to load survey providers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await refreshUser();
    toast.success('Balance refreshed!');
  };

  const openFullscreen = (provider) => {
    setFullscreenProvider(provider);
  };

  const closeFullscreen = () => {
    setFullscreenProvider(null);
    refreshUser();
  };

  const openInNewTab = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
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

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="surveys-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              Survey Walls
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Complete surveys and offers to earn points
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {user?.balance?.toLocaleString() || 0} pts
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="rounded-full"
              data-testid="refresh-balance-btn"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Provider Tabs */}
        <Tabs value={activeProvider} onValueChange={setActiveProvider}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all">All Providers</TabsTrigger>
            {providers.map((p) => (
              <TabsTrigger key={p.id} value={p.id} data-testid={`tab-${p.id}`}>
                {p.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* All Providers View */}
          <TabsContent value="all" className="mt-6">
            <div className="grid md:grid-cols-3 gap-6">
              {providers.map((provider) => (
                <Card 
                  key={provider.id}
                  className="glass-card border-slate-200 dark:border-white/10 hover:scale-[1.02] transition-transform"
                  data-testid={`provider-card-${provider.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
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
                        <h3 className="font-semibold text-slate-900 dark:text-white font-['Outfit']">
                          {provider.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 rounded-xl"
                        style={{ backgroundColor: provider.color }}
                        onClick={() => setActiveProvider(provider.id)}
                        data-testid={`open-${provider.id}`}
                      >
                        Open Wall
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl"
                        onClick={() => openInNewTab(provider.iframe_url)}
                        data-testid={`external-${provider.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Info Card */}
            <Card className="glass-card border-slate-200 dark:border-white/10 mt-6">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white font-['Outfit'] mb-2">
                  How it works
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">1.</span>
                    Choose a survey provider above to view available surveys
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">2.</span>
                    Complete surveys honestly and accurately
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">3.</span>
                    Points are credited automatically to your balance
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">4.</span>
                    Withdraw your earnings once you reach 500 points
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Individual Provider Views */}
          {providers.map((provider) => (
            <TabsContent key={provider.id} value={provider.id} className="mt-6">
              <Card className="glass-card border-slate-200 dark:border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${provider.color}20` }}
                      >
                        <span 
                          className="text-lg font-bold"
                          style={{ color: provider.color }}
                        >
                          {provider.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {provider.name}
                        </h3>
                        <p className="text-xs text-slate-500">{provider.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openFullscreen(provider)}
                        className="rounded-lg"
                      >
                        <Maximize2 className="w-4 h-4 mr-2" />
                        Fullscreen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInNewTab(provider.iframe_url)}
                        className="rounded-lg"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        New Tab
                      </Button>
                    </div>
                  </div>
                  
                  {/* Iframe Container */}
                  <div className="relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                    <iframe
                      src={provider.iframe_url}
                      className="w-full border-0"
                      style={{ height: '700px' }}
                      title={`${provider.name} Survey Wall`}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                      data-testid={`iframe-${provider.id}`}
                    />
                  </div>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                    Complete surveys above to earn points. Your balance updates automatically.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenProvider && (
        <div className="fixed inset-0 z-50 bg-slate-950">
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${fullscreenProvider.color}20` }}
              >
                <span 
                  className="text-sm font-bold"
                  style={{ color: fullscreenProvider.color }}
                >
                  {fullscreenProvider.name.charAt(0)}
                </span>
              </div>
              <span className="font-semibold text-white">{fullscreenProvider.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">
                  {user?.balance?.toLocaleString() || 0} pts
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeFullscreen}
                className="text-white hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <iframe
            src={fullscreenProvider.iframe_url}
            className="w-full border-0"
            style={{ height: 'calc(100vh - 64px)' }}
            title={`${fullscreenProvider.name} Survey Wall`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      )}
    </DashboardLayout>
  );
}
