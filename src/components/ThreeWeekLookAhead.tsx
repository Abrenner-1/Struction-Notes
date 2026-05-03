import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Circle,
  AlertTriangle,
  ArrowRight,
  Pencil,
  Trash2,
  Plus,
  Search,
  X
} from 'lucide-react';
import { 
  format, 
  isAfter, 
  isBefore, 
  addDays, 
  startOfDay, 
  endOfDay, 
  addWeeks,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { cn } from '../lib/utils';
import type { Task, Project, ScheduleItem } from '../types';

interface ThreeWeekLookAheadProps {
  project: Project;
  tasks: Task[];
  scheduleItems: ScheduleItem[];
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onPromoteItem: (item: ScheduleItem) => void;
  onAddScheduleItem: () => void;
  onEditScheduleItem: (item: ScheduleItem) => void;
}

export default function ThreeWeekLookAhead({ 
  project, 
  tasks, 
  scheduleItems, 
  onToggleTask, 
  onEditTask, 
  onDeleteTask,
  onPromoteItem,
  onAddScheduleItem,
  onEditScheduleItem
}: ThreeWeekLookAheadProps) {
  const now = startOfDay(new Date());
  const [viewMode, setViewMode] = React.useState<'standard' | 'expanded'>('standard');
  const [searchQuery, setSearchQuery] = React.useState('');

  const buckets = useMemo(() => {
    // Current window
    const week1Start = now;
    const week1End = endOfDay(addDays(now, 6));

    const week2Start = startOfDay(addDays(week1End, 1));
    const week2End = endOfDay(addDays(week2Start, 6));

    const week3Start = startOfDay(addDays(week2End, 1));
    const week3End = endOfDay(addDays(week3Start, 6));

    const nextWindowStart = startOfDay(addDays(week3End, 1));

    const filterAndGroup = (start: Date | null, end: Date | null) => {
      // Filter both tasks and scheduleItems
      const items = [
        ...tasks.map(t => ({ ...t, displayType: 'task' as const })),
        ...scheduleItems.map(s => ({ ...s, displayType: 'schedule' as const }))
      ].filter(item => {
        if (!item.dueDate) return false;
        
        const matchesSearch = !searchQuery || 
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subcontractor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.division?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        try {
          const d = item.dueDate.toDate();
          if (start && isBefore(d, start)) return false;
          if (end && isAfter(d, end)) return false;
          return true;
        } catch (e) {
          return false;
        }
      }).sort((a, b) => {
        const dateA = a.dueDate?.toMillis() || 0;
        const dateB = b.dueDate?.toMillis() || 0;
        return dateA - dateB;
      });

      // Group by division
      const grouped: { division: string, items: any[] }[] = [];
      items.forEach(item => {
        const divName = item.division || 'Unassigned';
        let group = grouped.find(g => g.division === divName);
        if (!group) {
          group = { division: divName, items: [] };
          grouped.push(group);
        }
        group.items.push(item);
      });
      return grouped;
    };

    const coreBuckets = [
      {
        title: "Week 1: Current Focus",
        dateRange: `${format(week1Start, 'MMM dd')} - ${format(week1End, 'MMM dd')}`,
        groups: filterAndGroup(week1Start, week1End),
        accent: "border-orange-500",
        bg: "bg-orange-50"
      },
      {
        title: "Week 2: Upcoming Ops",
        dateRange: `${format(week2Start, 'MMM dd')} - ${format(week2End, 'MMM dd')}`,
        groups: filterAndGroup(week2Start, week2End),
        accent: "border-blue-500",
        bg: "bg-blue-50"
      },
      {
        title: "Week 3: Long Range",
        dateRange: `${format(week3Start, 'MMM dd')} - ${format(week3End, 'MMM dd')}`,
        groups: filterAndGroup(week3Start, week3End),
        accent: "border-slate-500",
        bg: "bg-slate-50 dark:bg-slate-950"
      }
    ];

    if (viewMode === 'expanded') {
      coreBuckets.push({
        title: "Beyond 3 Weeks",
        dateRange: `Starting ${format(nextWindowStart, 'MMM dd')}`,
        groups: filterAndGroup(nextWindowStart, null),
        accent: "border-emerald-500",
        bg: "bg-emerald-50"
      });
    }

    return coreBuckets;
  }, [tasks, scheduleItems, now, viewMode]);

  const overdueBuckets = useMemo(() => {
    // Items with dueDate before today and not completed
    const items = [
      ...tasks.filter(t => !t.completed).map(t => ({ ...t, displayType: 'task' as const })),
      ...scheduleItems.map(s => ({ ...s, displayType: 'schedule' as const }))
    ].filter(item => {
      if (!item.dueDate) return false;
      
      const matchesSearch = !searchQuery || 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subcontractor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.division?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      return isBefore(item.dueDate.toDate(), now);
    }).sort((a, b) => {
      const dateA = a.dueDate?.toMillis() || 0;
      const dateB = b.dueDate?.toMillis() || 0;
      return dateA - dateB;
    });

    const grouped: { division: string, items: any[] }[] = [];
    items.forEach(item => {
      const divName = item.division || 'Unassigned';
      let group = grouped.find(g => g.division === divName);
      if (!group) {
        group = { division: divName, items: [] };
        grouped.push(group);
      }
      group.items.push(item);
    });
    return grouped;
  }, [tasks, scheduleItems, now]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search schedule, subcontractors, or divisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all font-medium text-slate-700 dark:text-slate-300"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('standard')}
              className={cn(
                "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'standard' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
              )}
            >
              3-Week Window
            </button>
            <button 
              onClick={() => setViewMode('expanded')}
              className={cn(
                "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'expanded' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
              )}
            >
              Full Horizon
            </button>
          </div>
          <button 
            onClick={onAddScheduleItem}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Overdue Items Alert / Section */}
      {overdueBuckets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-black text-red-600 uppercase tracking-widest">Past Due / Delays</h3>
          </div>
          <div className="bg-red-50/30 border border-red-100 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {overdueBuckets.map((group, grpIdx) => (
                <React.Fragment key={`overdue-group-${group.division}-${grpIdx}`}>
                  {group.items.map((item: any, itmIdx: number) => (
                    <ItemCard 
                      key={`overdue-${item.displayType}-${item.id}-${itmIdx}`}
                      item={item}
                      onToggle={onToggleTask}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onPromote={onPromoteItem}
                      onEditSchedule={onEditScheduleItem}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-24">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Items</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">
              {buckets.reduce((acc, b) => acc + b.groups.reduce((ga, g) => ga + g.items.length, 0), 0)}
            </span>
            <Calendar className="w-5 h-5 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-24">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasks Completed</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-emerald-600 leading-none">
              {buckets.reduce((acc, b) => acc + b.groups.reduce((ga, g) => ga + g.items.filter((t: any) => t.displayType === 'task' && t.completed).length, 0), 0)}
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        <div className={cn(
          "bg-white dark:bg-slate-900 p-4 rounded-xl border flex flex-col justify-between h-24 transition-colors",
          overdueBuckets.length > 0 ? "border-red-200 bg-red-50" : "border-slate-200 dark:border-slate-700"
        )}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Past Due</p>
          <div className="flex items-end justify-between">
            <span className={cn("text-3xl font-black leading-none", overdueBuckets.length > 0 ? "text-red-600" : "text-slate-900 dark:text-slate-100")}>
              {overdueBuckets.reduce((acc, g) => acc + g.items.length, 0)}
            </span>
            <AlertTriangle className={cn("w-5 h-5", overdueBuckets.length > 0 ? "text-red-500" : "text-slate-300")} />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl flex flex-col justify-between h-24 text-white">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conversion Rate</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black leading-none">
              {Math.round((tasks.length / (tasks.length + scheduleItems.length || 1)) * 100)}%
            </span>
            <div className="w-8 h-2 bg-slate-700 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-orange-500" 
                 style={{ width: `${(tasks.length / (tasks.length + scheduleItems.length || 1)) * 100}%` }}
               />
            </div>
          </div>
        </div>
      </div>

      {/* Main Buckets */}
      <div className={cn(
        "grid grid-cols-1 gap-6",
        viewMode === 'standard' ? "lg:grid-cols-3" : "lg:grid-cols-4"
      )}>
        {buckets.map((bucket, bIdx) => (
          <div key={bucket.title} className="flex flex-col h-full min-h-[500px]">
            <div className={cn(
              "p-4 border-t-4 rounded-t-xl bg-white dark:bg-slate-900 shadow-sm mb-4 border-b border-l border-r border-slate-200 dark:border-slate-700",
              bucket.accent
            )}>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-sm">{bucket.title}</h3>
                <span className="text-xs font-bold text-slate-400">
                  {bucket.groups.reduce((acc, g) => acc + g.items.length, 0)}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{bucket.dateRange}</p>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pr-1">
              {bucket.groups.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white/50">
                  <Clock className="w-6 h-6 text-slate-300 mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">No scheduled items</p>
                </div>
              ) : (
                bucket.groups.map((group, grpIdx) => (
                  <div key={`${bucket.title}-${group.division}-${grpIdx}`} className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {group.division}
                      </span>
                      <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
                    </div>
                    
                    {group.items.map((item, itmIdx) => (
                      <ItemCard 
                        key={`${item.displayType}-${item.id}-${itmIdx}`}
                        item={item}
                        onToggle={onToggleTask}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        onPromote={onPromoteItem}
                        onEditSchedule={onEditScheduleItem}
                        delay={bIdx * 0.1}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ItemCardProps {
  key?: React.Key;
  item: any;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onPromote: (item: ScheduleItem) => void;
  onEditSchedule: (item: ScheduleItem) => void;
  delay?: number;
}

function ItemCard({ item, onToggle, onEdit, onDelete, onPromote, onEditSchedule, delay = 0 }: ItemCardProps) {
  const isTask = item.displayType === 'task';
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all group",
        isTask ? "hover:border-orange-200" : "border-dashed border-slate-300 hover:border-blue-300 bg-slate-50/50",
        isTask && item.completed && "opacity-60 grayscale-[0.5]"
      )}
    >
      <div className="flex items-start gap-3">
        {isTask ? (
          <button 
            onClick={() => onToggle(item)}
            className="mt-1 transition-transform active:scale-95 shrink-0"
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5 text-slate-300 group-hover:text-orange-400" />
            )}
          </button>
        ) : (
          <div className="shrink-0 flex flex-col gap-2 mt-1">
            <button 
              onClick={() => onPromote(item)}
              className="w-5 h-5 rounded-full border border-blue-300 flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition-all shrink-0 active:scale-90"
              title="Convert to Project Task"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button 
              onClick={() => onEditSchedule(item)}
              className="p-1 text-slate-300 hover:text-blue-500 transition-all rounded"
              title="Edit Schedule Item"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
             <h4 className={cn(
               "text-sm font-bold leading-tight line-clamp-2",
               isTask && item.completed ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100",
               isTask ? "group-hover:text-orange-600" : "text-slate-600 dark:text-slate-400"
             )}>
               {item.title}
             </h4>
             {isTask && (
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0 bg-white dark:bg-slate-900 shadow-sm p-1 rounded-lg">
                 {!showConfirmDelete ? (
                   <>
                     <button 
                       onClick={() => onEdit(item)}
                       className="p-1 text-slate-400 hover:text-orange-500 transition-all rounded"
                       title="Edit Task"
                     >
                       <Pencil className="w-3.5 h-3.5" />
                     </button>
                     <button 
                       onClick={() => setShowConfirmDelete(true)}
                       className="p-1 text-slate-400 hover:text-red-500 transition-all rounded"
                       title="Delete Task"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   </>
                 ) : (
                   <div className="flex items-center gap-2 px-1">
                     <button 
                       onClick={() => { onDelete(item.id); setShowConfirmDelete(false); }}
                       className="text-[9px] font-bold text-red-600 uppercase hover:underline"
                     >
                       DEL
                     </button>
                     <button 
                       onClick={() => setShowConfirmDelete(false)}
                       className="text-[9px] font-bold text-slate-400 uppercase hover:underline"
                     >
                       ESC
                     </button>
                   </div>
                 )}
               </div>
             )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-3">
             {item.startDate && !isTask ? (
               <div className="flex items-center gap-1 shrink-0 bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800 max-w-full overflow-hidden">
                 <Clock className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                 <span className="text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">
                    S: {format(item.startDate.toDate(), 'MMM dd')}
                 </span>
                 <ArrowRight className="w-2 h-2 text-slate-300 mx-0.5 shrink-0" />
                 <span className="text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">
                    F: {item.finishDate ? format(item.finishDate.toDate(), 'MMM dd') : (item.dueDate ? format(item.dueDate.toDate(), 'MMM dd') : '--')}
                 </span>
               </div>
             ) : (
               <div className="flex items-center gap-1 shrink-0">
                 <Calendar className="w-3 h-3 text-slate-400" />
                 <span className="text-[10px] font-bold text-slate-500 uppercase">
                   {item.dueDate ? format(item.dueDate.toDate(), 'EEE, MMM dd') : '--'}
                 </span>
               </div>
             )}
             {item.subcontractor && (
               <div className="flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                 <div className="w-1 h-1 rounded-full bg-orange-400" />
                 <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">
                   {item.subcontractor}
                 </span>
               </div>
             )}
             {!isTask && (
                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  Imported
                </span>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
