import { AnimatePresence, motion } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { Notification } from '../../hooks/useGlobalReminders';

interface NotificationStackProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationStack({ notifications, onRemove }: NotificationStackProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, x: 50 }}
            className="bg-slate-900 text-white px-5 py-4 rounded-xl shadow-2xl flex items-start gap-4 min-w-[300px] border border-slate-800"
          >
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Task Alert</p>
              <p className="text-sm font-semibold">{notification.title}</p>
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
