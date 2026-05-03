import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, User, Image as ImageIcon, Save } from 'lucide-react';
import { updateProfile } from '../../lib/firebase';

export function ProfileModal({ user, onClose }: { user: any, onClose: () => void }) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);

    try {
      await updateProfile(user, {
        displayName,
        photoURL
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Profile update failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-8 shadow-2xl overflow-hidden relative"
      >
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-0 left-0 right-0 py-2 bg-emerald-500 text-white text-center text-xs font-bold"
          >
            Profile updated successfully
          </motion.div>
        )}
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Account</h2>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">User Profile</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-4 border-slate-50 shadow-inner mb-4 relative group">
            {photoURL ? (
              <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-500">
                <User className="w-12 h-12" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImageIcon className="text-white w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">Public recognition across projects</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Display name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required 
                placeholder="Full Name" 
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg pl-10 pr-4 py-3 outline-none transition-all text-sm" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Profile Picture URL</label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/avatar.jpg" 
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg pl-10 pr-4 py-3 outline-none transition-all text-sm" 
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? 'Saving Changes...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
