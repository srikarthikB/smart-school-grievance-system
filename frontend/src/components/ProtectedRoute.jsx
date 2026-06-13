import React from "react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, refreshUser } = useAuth();
  const [checkingSession, setCheckingSession] = useState(false);
  const location = useLocation();
  // Track whether we've already fired the refresh for this mount so
  // StrictMode's double-invoke doesn't send two requests.
  const didCheck = useRef(false);

  useEffect(() => {
    // BUG-05: Drop the `user &&` guard. The previous code skipped server
    // validation when user was null but a token existed — e.g. right after
    // the auth:logout event cleared state but before the redirect fired.
    // Now: any mount with a token triggers a fresh /auth/me call.
    if (loading || didCheck.current || !localStorage.getItem("token")) return;
    didCheck.current = true;
    setCheckingSession(true);
    refreshUser()
      .catch(() => {})
      .finally(() => setCheckingSession(false));
  }, [loading, refreshUser]);

  if (loading || checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin border-2 border-emerald-800 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    // BUG-13: Stash the attempted location so Login can redirect back after
    // a successful login, instead of always landing on the role home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // BUG-07: Note — /complaints/:id is gated to all authenticated roles here,
  // but ownership enforcement (student can only see their own complaints) MUST
  // be handled in the backend GET /complaints/:id handler. This component
  // cannot enforce ownership; it only checks authentication and role.
  return children;
}