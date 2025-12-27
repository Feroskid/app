import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { processGoogleSession } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          console.error('No session_id found');
          navigate('/login');
          return;
        }

        // Process the session
        const user = await processGoogleSession(sessionId);
        
        // Clear the hash and navigate to dashboard with user data
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { state: { user } });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };

    processSession();
  }, [navigate, processGoogleSession]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Completing sign in...</p>
      </div>
    </div>
  );
}
