import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, PlusCircle, Newspaper, LogOut, Sun, Moon, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  isDark?: boolean;
  setIsDark?: (dark: boolean) => void;
}

export function Layout({ children, isDark, setIsDark }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  const navItems = [
    { label: 'Archive', path: '/dashboard', icon: LayoutGrid },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Compose', path: '/editor', icon: PlusCircle },
  ];

  return (
    <div className="flex h-screen font-sans text-inherit">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 glass m-4 rounded-3xl flex-col shadow-xl shadow-black/[0.03]">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
              <Newspaper className="w-5 h-5 text-[#DAFB37]" />
            </div>
            <h1 className="font-black text-xl tracking-tighter text-inherit uppercase">CHRONICLE</h1>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path || (item.path === '/editor' && location.pathname.startsWith('/editor/'));
              return (
                <Link
                  key={item.path}
                  id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300",
                    active 
                      ? "bg-[#DAFB37] text-black shadow-lg shadow-[#DAFB37]/20 scale-[1.02]" 
                      : "opacity-60 hover:bg-white/10 hover:opacity-100"
                  )}
                >
                  <item.icon className={cn("w-4 h-4")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <button 
            onClick={() => setIsDark?.(!isDark)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold opacity-60 hover:bg-white/10 hover:opacity-100 transition-all duration-300"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>

          <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/40">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Ready</p>
            <p className="text-[11px] font-medium leading-relaxed opacity-50">
              Managing archive with real-time syncing enabled.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-6xl mx-auto p-6 lg:p-12"
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="lg:hidden fixed bottom-6 left-6 right-6 h-16 glass rounded-2xl flex items-center justify-around px-6 z-50 shadow-2xl">
        {navItems.map((item) => {
          const active = location.pathname === item.path || (item.path === '/editor' && location.pathname.startsWith('/editor/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "p-3 rounded-xl transition-all duration-300",
                active ? "bg-[#DAFB37] text-black scale-110" : "opacity-40"
              )}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
        <button 
          onClick={() => setIsDark?.(!isDark)}
          className="p-3 opacity-40"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </nav>
    </div>
  );
}
