import React from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, refreshUser } = useAuth();
  const [checkingSession, setCheckingSession] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!loading && user && localStorage.getItem("token")) {
      setCheckingSession(true);
      refreshUser()
        .catch(() => {})
        .finally(() => {
          if (!ignore) setCheckingSession(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [loading, refreshUser]);

  if (loading || checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin border-2 border-emerald-800 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
