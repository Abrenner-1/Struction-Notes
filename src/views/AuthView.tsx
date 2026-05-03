import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { HardHat } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { BrandName } from '../components/Branding';

export function AuthView({ initialError, onGuestBypass }: { initialError?: string | null, onGuestBypass: () => void }) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Sign in failed:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError("Unauthorized Domain: Please add 'structionnotes.com' to your Firebase Console -> Authentication -> Settings -> Authorized domains.");
        setIsSigningIn(false);
      } else if (err.code !== 'auth/popup-blocked' && err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || "Could not sign in with Google. Please try again.");
        setIsSigningIn(false);
      }
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 font-sans overflow-hidden">
      {/* Background with blur and overlay */}
      <div className="absolute inset-0 z-0 bg-brand-navy overflow-hidden">
        {/* CSS Blueprint Background */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: `linear-gradient(rgba(242, 102, 36, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(242, 102, 36, 0.1) 1px, transparent 1px)`,
               backgroundSize: '40px 40px'
             }} 
        />
        <div className="absolute inset-0 opacity-10" 
             style={{ 
               backgroundImage: `linear-gradient(rgba(242, 102, 36, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(242, 102, 36, 0.05) 1px, transparent 1px)`,
               backgroundSize: '10px 10px'
             }} 
        />
        
        {/* SVG Structural Elements (Wireframe) */}
        <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
          <pattern id="building" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
             <path d="M 50 400 L 50 100 L 350 100 L 350 400 M 50 150 L 350 150 M 50 200 L 350 200 M 50 250 L 350 250 M 50 300 L 350 300 M 50 350 L 350 350 M 150 100 L 150 400 M 250 100 L 250 400" 
                   fill="none" stroke="rgba(249, 115, 22, 0.3)" strokeWidth="1" />
             <path d="M 50 100 L 10 140 M 350 100 L 390 140 M 50 400 L 10 360 M 350 400 L 390 360" 
                   fill="none" stroke="rgba(249, 115, 22, 0.2)" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#building)" />
        </svg>

        {/* Subtle noise and glow overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#050811_100%)]" />
        <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-[4px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-brand-navy/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_0_50px_-12px_rgba(242,102,36,0.2)] border border-white/5 text-center relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-full h-40 flex items-center justify-center overflow-hidden">
            <BrandName variant="stacked" className="h-full w-full" />
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent mt-6 mb-2" />
          <p className="text-slate-400 font-medium text-xs tracking-[0.2em] uppercase">Field Management Protocol</p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 bg-white/5 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all duration-200 group disabled:opacity-50 disabled:cursor-wait border border-white/5"
          >
            {isSigningIn ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full"
              />
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:scale-110 transition-all" alt="Google" />
            )}
            {isSigningIn ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-slate-700 flex-1" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">or</span>
            <div className="h-px bg-slate-700 flex-1" />
          </div>

          <button
            onClick={onGuestBypass}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-500 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-orange-900/20"
          >
            Continue as Guest (Local)
          </button>

          {isSigningIn && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 animate-pulse">
                Checking authentication...
              </p>
              <p className="text-[10px] text-slate-400">
                If no window appears, please check for blocked pop-ups or wait to be redirected.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
