/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { Analytics } from './pages/Analytics';
import { AuthPage } from './pages/AuthPage';
import { Loader2 } from 'lucide-react';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-10 h-10 animate-spin text-[#1A1A1A]" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} />
        
        <Route path="/" element={user ? <Layout isDark={isDark} setIsDark={setIsDark}><Navigate to="/dashboard" replace /></Layout> : <Navigate to="/auth" replace />} />
        <Route path="/dashboard" element={user ? <Layout isDark={isDark} setIsDark={setIsDark}><Dashboard /></Layout> : <Navigate to="/auth" replace />} />
        <Route path="/editor" element={user ? <Layout isDark={isDark} setIsDark={setIsDark}><Editor /></Layout> : <Navigate to="/auth" replace />} />
        <Route path="/editor/:id" element={user ? <Layout isDark={isDark} setIsDark={setIsDark}><Editor /></Layout> : <Navigate to="/auth" replace />} />
        <Route path="/analytics" element={user ? <Layout isDark={isDark} setIsDark={setIsDark}><Analytics /></Layout> : <Navigate to="/auth" replace />} />
      </Routes>
      <ToastContainer position="bottom-right" theme={isDark ? 'dark' : 'light'} aria-label="Toast notifications" />
    </BrowserRouter>
  );
}
