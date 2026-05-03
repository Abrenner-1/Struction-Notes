import React from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';

export function ConfirmClearModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 font-display">Clear Schedule?</h2>
        <p className="text-sm text-slate-500 mb-8 font-sans">
          This will permanently delete all imported 3-week lookahead items for this project. Tasks will not be affected. This action cannot be undone.
        </p>
        <div className="space-y-3">
          <button 
            onClick={onConfirm}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg text-xs uppercase tracking-widest font-sans"
          >
            Confirm Delete
          </button>
          <button 
            onClick={onClose}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs uppercase tracking-widest font-sans"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
