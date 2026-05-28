import { motion } from 'motion/react';
import { Logo } from '../Branding';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full" />
        <Logo className="w-24 h-24 relative z-10" />
      </motion.div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-slate-400 text-[10px] font-black animate-pulse tracking-[0.3em] uppercase">Struction Notes</p>
        <div className="flex gap-1">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: index * 0.2 }}
              className="w-1.5 h-1.5 bg-orange-500 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
