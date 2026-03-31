import { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "../hooks/useToast";
import { useLocation } from "../hooks/useLocation";

const STORAGE_KEY = "clickngo_user";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { msg: toastMsg, show } = useToast();
  const [user, setUserState] = useState(null);
  const [location, setLocation] = useState("Street 133, Times Square, NYC");

  useLocation(setLocation);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && parsed.name) {
          setUserState(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load user from localStorage", e);
    }
  }, []);

  // Persist user to localStorage on change
  const setUser = (u) => {
    setUserState(u);
    if (u) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      } catch (e) {
        console.warn("Failed to save user to localStorage", e);
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('token');
      } catch (e) {}
    }
  };

  const loginFn = async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");

      // Decode token gently
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      const userData = { id: payload.id, role: payload.role, email };

      localStorage.setItem('token', data.token);
      setUser(userData);
      return userData;
    } catch (err) {
      throw err;
    }
  };

  const registerFn = async (name, email, password, role, phone) => {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, phone })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed");
      return data.user;
  };

  const value = {
    user,
    setUser,
    loginFn,
    registerFn,
    location,
    setLocation,
    showToast: show,
    toastMsg,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return ctx;
}
