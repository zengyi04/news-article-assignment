import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithRedirect,
  GoogleAuthProvider,
  updateProfile,
  signOut
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Loader2, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await signOut(auth);
        setIsLogin(true);
        setName('');
        setPassword('');
        setError('Account created. Please sign in to continue.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      // Add scopes for better user info
      provider.addScope('profile');
      provider.addScope('email');
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      
      // Handle specific Firebase auth errors
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Please add localhost to Firebase Auth domains or use email/password.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups and try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Sign-in was cancelled. Please try again.');
      } else {
        setError(err.message || 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass p-10 rounded-[40px] shadow-2xl shadow-black/10 border-white/50 text-center">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-[#1A1A1A] rounded-[24px] flex items-center justify-center shadow-xl shadow-[#DAFB37]/10">
              <Newspaper className="w-8 h-8 text-[#DAFB37]" />
            </div>
          </div>

          <h1 className="text-4xl font-black tracking-tighter text-[#1A1A1A] mb-2 uppercase">
            {isLogin ? 'Welcome Back' : 'Join Chronicle'}
          </h1>
          <p className="text-sm font-medium text-[#4A4A4A] opacity-60 mb-10">
            {isLogin ? 'Access your archived insights' : 'Start your editorial journey today'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] opacity-50 ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A] opacity-30 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      type="text"
                      required={!isLogin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/50 border-2 border-white focus:border-[#DAFB37] transition-all outline-none font-bold text-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] opacity-50 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A] opacity-30 group-focus-within:opacity-100 transition-opacity" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/50 border-2 border-white focus:border-[#DAFB37] transition-all outline-none font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] opacity-50 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A] opacity-30 group-focus-within:opacity-100 transition-opacity" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/50 border-2 border-white focus:border-[#DAFB37] transition-all outline-none font-bold text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center mt-4">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-[#1A1A1A] text-[#DAFB37] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-8"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-black opacity-5" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">or</span>
            <div className="flex-1 h-px bg-black opacity-5" />
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mt-8 flex items-center justify-center gap-3 py-4 rounded-2xl bg-white border-2 border-white hover:border-[#DAFB37] transition-all text-[#1A1A1A] font-bold text-xs shadow-sm hover:shadow-lg disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Continue with Google
          </button>

          <p className="mt-10 text-xs font-bold text-[#4A4A4A] opacity-50">
            {isLogin ? "Don't have an account?" : "Already a member?"}{' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#1A1A1A] opacity-100 hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
