import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteProjectModalProps {
  projectName: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}

export function ConfirmDeleteProjectModal({ projectName, onConfirm, onClose, isLoading }: ConfirmDeleteProjectModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Delete Project?</h2>
        <p className="text-slate-500 text-sm mb-8">
          Are you sure you want to delete <span className="font-bold text-slate-700 dark:text-slate-300">"{projectName}"</span>? This action is permanent and will remove all site documentation, tasks, and project history.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />}
            {isLoading ? 'Deleting...' : 'Delete Permanently'}
          </button>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
