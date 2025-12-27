import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { user, loading, isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(!location.state?.user);

  useEffect(() => {
    // If user data was passed from AuthCallback, skip check
    if (location.state?.user) {
      setIsChecking(false);
      return;
    }

    // Wait for auth check to complete
    if (!loading) {
      setIsChecking(false);
    }
  }, [loading, location.state]);

  // Show loading while checking auth
  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
