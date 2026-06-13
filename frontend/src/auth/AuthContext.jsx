import React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [loading, setLoading] = useState(true);

  // BUG-11: AuthProvider cannot call useNavigate directly because it sits
  // above <Router> in the original tree. We accept an optional onLogout
  // callback (injected by main.jsx after Router is in scope) so that
  // logout() can redirect without coupling AuthContext to react-router.
  const onLogoutRef = useRef(null);
  const setOnLogout = useCallback((fn) => { onLogoutRef.current = fn; }, []);

  const refreshUser = useCallback(async function refreshUser() {
    if (!localStorage.getItem("token")) {
      setUser(null);
      return null;
    }
    const res = await api.get("/auth/me");
    setUser(res.data);
    localStorage.setItem("user", JSON.stringify(res.data));
    return res.data;
  }, []);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      refreshUser()
        .catch(() => _clearSession())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // BUG-12: handleForcedLogout must clear storage itself — it cannot rely
    // on client.js having already done it, because any caller of the
    // "auth:logout" event may not.
    const handleForcedLogout = () => {
      _clearSession();
    };
    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, []);

  function _clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  async function register(payload) {
    const res = await api.post("/auth/register", payload);
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  async function logout() {
    // BUG-04: Tell the server to bump token_version, invalidating this JWT.
    // Fire-and-forget — client-side session is cleared regardless of outcome.
    try {
      await api.post("/auth/logout");
    } catch (_) {
      // Ignore network errors; we still clear the local session.
    }
    _clearSession();
    // BUG-11: Redirect to /login. The callback is set by RouterBoundary in
    // main.jsx, which lives inside <Router> and has access to useNavigate.
    onLogoutRef.current?.();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setOnLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}