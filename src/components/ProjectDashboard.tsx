import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Users, 
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Truck,
  ClipboardList,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { cn } from '../lib/utils';
import type { ProjectTab } from '../lib/routes';

import { Note, Task, ProcurementItem, ScheduleItem, Meeting } from '../types';
import { format, isAfter, isBefore, startOfDay, endOfDay, addDays, isSameDay, formatDistanceToNow } from 'date-fns';

interface ProjectDashboardProps {
  project: {
    id: string;
    name: string;
    description?: string;
    location?: string;
    projectManager?: string;
    teamMembers?: { initials: string, color: string }[];
  };
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
  scheduleItems: ScheduleItem[];
  user: any;
  onNavigate: (tab: ProjectTab, id?: string) => void;
}

export default function ProjectDashboard({ 
  project, 
  notes, 
  tasks, 
  meetings,
  scheduleItems,
  user,
  onNavigate 
}: ProjectDashboardProps) {
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);

  useEffect(() => {
    if (!project.id || !user) return;

    const path = `projects/${project.id}/procurement`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProcurementItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProcurementItem)));
    }, (err) => {
      handleFirestoreError(err, 'get', path);
    });

    return () => unsubscribe();
  }, [project.id, user]);

  const now = startOfDay(new Date());

  const upcomingTasks = tasks
    .filter(t => !t.completed && t.dueDate)
    .sort((a, b) => {
      const dateA = a.dueDate?.toMillis() || 0;
      const dateB = b.dueDate?.toMillis() || 0;
      return dateA - dateB;
    });

  const weeklyBuckets = useMemo(() => {
    const buckets = [
      { start: now, end: endOfDay(addDays(now, 6)), title: 'Week 1', label: 'Current Focus' },
      { start: startOfDay(addDays(now, 7)), end: endOfDay(addDays(now, 13)), title: 'Week 2', label: 'Upcoming' },
      { start: startOfDay(addDays(now, 14)), end: endOfDay(addDays(now, 20)), title: 'Week 3', label: 'Long Range' },
    ];

    return buckets.map(bucket => {
      const bucketTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = task.dueDate.toDate();
        return (isAfter(dueDate, bucket.start) || isSameDay(dueDate, bucket.start)) && 
               (isBefore(dueDate, bucket.end) || isSameDay(dueDate, bucket.end));
      });
      const bucketSchedule = scheduleItems.filter(item => {
        if (!item.dueDate) return false;
        const dueDate = item.dueDate.toDate();
        return (isAfter(dueDate, bucket.start) || isSameDay(dueDate, bucket.start)) && 
               (isBefore(dueDate, bucket.end) || isSameDay(dueDate, bucket.end));
      });

      return {
        ...bucket,
        items: [
          ...bucketTasks.map(t => ({ ...t, type: 'task' })),
          ...bucketSchedule.map(s => ({ ...s, type: 'schedule' }))
        ]
      };
    });
  }, [tasks, scheduleItems, now]);

  const criticalProcurement = procurementItems
    .filter(item => item.status !== 'On Site')
    .sort((a, b) => {
      const dateA = a.expectedDate ? new Date(a.expectedDate).getTime() : Infinity;
      const dateB = b.expectedDate ? new Date(b.expectedDate).getTime() : Infinity;
      return dateA - dateB;
    });

  const recentActivities = useMemo(() => {
    const activities = [
      ...notes.map(note => ({
        id: note.id,
        title: note.title,
        type: note.type,
        category: 'Site Observation',
        date: note.createdAt?.toDate() || new Date(note.date),
        icon: <FileText className="w-5 h-5" />,
        onClick: () => onNavigate('notes', note.id)
      })),
      ...meetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        type: 'Minutes',
        category: 'Meeting Record',
        date: meeting.createdAt?.toDate() || meeting.date.toDate(),
        icon: <ClipboardList className="w-5 h-5" />,
        onClick: () => onNavigate('meetings', meeting.id)
      }))
    ];

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3);
  }, [notes, meetings, onNavigate]);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Welcome to {project.name}</h2>
          <p className="text-slate-500 max-w-2xl leading-relaxed">
            {project.description || 'Monitor your project progress, site documentation, and team tasks from this central workspace.'}
          </p>
          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              On Schedule
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <AlertCircle className="w-3 h-3 text-orange-500" />
              {tasks.filter(t => !t.completed).length} Pending Tasks
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <BarChart3 className="w-48 h-48 text-slate-900 dark:text-slate-100" />
        </div>
      </div>

      {/* 3-Week Look Ahead Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">3-Week Look Ahead</h3>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate('registers')} 
              className="text-[10px] font-bold text-slate-400 hover:text-orange-500 transition-colors uppercase tracking-widest flex items-center gap-1"
            >
              Full Schedule <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {weeklyBuckets.map((bucket, idx) => (
            <motion.div 
              key={bucket.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:border-orange-200 transition-all cursor-pointer group"
              onClick={() => onNavigate('registers')}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{bucket.title}</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{bucket.label}</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                  <span className="text-xs font-black">{bucket.items.length}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {bucket.items.slice(0, 2).map((item: any, i: number) => (
                  <div key={`dash-lookahead-${item.type}-${item.id}-${bucket.title}-${i}`} className="flex items-center gap-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      item.type === 'task' ? (item.completed ? "bg-emerald-400" : "bg-orange-400") : "bg-blue-400"
                    )} />
                    <span className={cn(
                      "text-[11px] truncate",
                      item.type === 'task' && item.completed ? "text-slate-300 line-through" : "text-slate-600 dark:text-slate-400 font-medium"
                    )}>
                      {item.title}
                    </span>
                  </div>
                ))}
                {bucket.items.length > 2 && (
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3.5">+{bucket.items.length - 2} more items</p>
                )}
                {bucket.items.length === 0 && (
                  <p className="text-[10px] text-slate-300 italic py-1">No items scheduled</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Actionable Insights Section (Replaces Stats Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks Column */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">Upcoming Tasks</h3>
            </div>
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[320px] custom-scrollbar">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task, i) => (
                <div 
                  key={`dash-upcoming-${task.id}-${i}`} 
                  onClick={() => onNavigate('tasks', task.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 hover:border-orange-100 hover:bg-orange-50/30 transition-all group cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-[10px] text-slate-400 font-medium">Due: {format(task.dueDate.toDate(), 'MMM dd, yyyy')}</p>
                    )}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-200 group-hover:text-orange-300 transition-colors" />
                </div>
              ))
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-center p-6">
                <CheckCircle2 className="w-8 h-8 text-slate-100 mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Clear</p>
                <p className="text-[10px] text-slate-400 mt-1">No upcoming tasks found.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Procurement Highlights Column */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">Procurement Log</h3>
            </div>
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[320px] custom-scrollbar">
            {criticalProcurement.length > 0 ? (
              criticalProcurement.map(item => (
                <div 
                  key={`dash-proc-${item.id}`} 
                  onClick={() => onNavigate('procurement', item.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all group cursor-pointer"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    item.status === 'Ordered' ? 'bg-blue-400' : 'bg-amber-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{item.tag}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.status}</p>
                    {item.expectedDate && (
                      <p className="text-[9px] text-slate-400 mt-0.5">{format(new Date(item.expectedDate), 'MM/dd/yy')}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-center p-6">
                <ClipboardList className="w-8 h-8 text-slate-100 mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No Items</p>
                <p className="text-[10px] text-slate-400 mt-1">Add items to procurement log to track.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Timeline/Status Table placeholder */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-widest">Recent Activity</h3>
          </div>
          <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
            {recentActivities.map((activity) => (
              <div 
                key={`dash-activity-${activity.id}`} 
                onClick={activity.onClick}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 dark:bg-slate-950 transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-orange-600 transition-colors">{activity.title}</p>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {formatDistanceToNow(activity.date, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{activity.type} • {activity.category}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-200 group-hover:text-orange-300 transition-colors shrink-0 self-center" />
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No recent activity found.</p>
            )}
          </div>
        </div>

        {/* Project Details Sidebar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-widest mb-6">Project Info</h3>
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Site Location</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{project.location || 'Not Specified'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Manager</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{project.projectManager || 'Not Specified'}</p>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-auto">
                <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98]">
                    Sync Field Data
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
