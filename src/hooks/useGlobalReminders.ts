import { useState, useEffect, useRef } from 'react';
import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
import { isBefore, isAfter, subDays } from 'date-fns';
import { db } from '../lib/firebase';
import { Task } from '../types';

export interface Notification {
  id: string;
  title: string;
  projectId: string;
}

export function useGlobalReminders(user: any) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  const addNotification = (id: string, title: string, projectId: string) => {
    if (shownNotificationsRef.current.has(id)) return;
    setNotifications(prev => {
      if (prev.some(n => n.id === id)) return prev;
      return [...prev, { id, title, projectId }];
    });
    shownNotificationsRef.current.add(id);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (!user) return;
    
    // Listen to all tasks across all projects for this user
    // Note: To truly optimize this, a schema change to include `hasReminder: true` 
    // and querying on that would significantly reduce document reads.
    const q = query(
      collectionGroup(db, 'tasks'),
      where('ownerId', '==', user.uid),
      where('completed', '==', false)
    );

    const checkReminders = (tasks: Task[]) => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.reminderAt) {
          const reminderTime = task.reminderAt.toDate();
          // Trigger notification if reminder time has passed within the last 24 hours
          if (isBefore(reminderTime, now) && isAfter(reminderTime, subDays(now, 1))) {
            addNotification(
              task.id,
              `Alert: ${task.title} ${task.projectName ? `[${task.projectName}]` : ''}`,
              task.projectId
            );
          }
        }
      });
    };

    let activeTasks: Task[] = [];

    const unsubscribe = onSnapshot(q, (snapshot) => {
      activeTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      checkReminders(activeTasks);
    }, (error) => {
      console.warn("Global task listener may require an index in Firebase console:", error);
    });

    const interval = setInterval(() => {
      checkReminders(activeTasks);
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user]);

  return { notifications, removeNotification };
}
