import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, Plus, FileText, CheckCircle2, ChevronRight, Edit3, Trash, LayoutDashboard, StickyNote, Package, ClipboardList, Users } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { collection, query, onSnapshot, writeBatch, doc, deleteDoc, addDoc, serverTimestamp, where, Timestamp, orderBy } from 'firebase/firestore';
import { Project, Note, Task, ScheduleItem, NoteType, Meeting } from '../types';
import { ExtractedTask } from '../services/importService';
import ProcurementLog from '../components/ProcurementLog';
import ProjectRegisters from '../components/ProjectRegisters';
import ProjectDashboard from '../components/ProjectDashboard';
import ScheduleImportModal from '../components/ScheduleImportModal';
import Meetings from '../components/Meetings';
import { NoteModal } from '../components/modals/NoteModal';
import { TaskModal } from '../components/modals/TaskModal';
import { ConfirmClearModal } from '../components/modals/ConfirmClearModal';
import { cn } from '../lib/utils';
import { NoteCard } from '../components/NoteCard';
import { SortableTaskCard } from '../components/SortableTaskCard';
import { ProjectCanvas } from './ProjectCanvas';

function getTimestampMillis(value: unknown) {
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

function sortTasks(tasksToSort: Task[]) {
  return [...tasksToSort].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    const aPosition = typeof a.position === 'number' ? a.position : null;
    const bPosition = typeof b.position === 'number' ? b.position : null;

    if (aPosition !== null && bPosition !== null && aPosition !== bPosition) {
      return aPosition - bPosition;
    }

    if (aPosition !== null) return -1;
    if (bPosition !== null) return 1;

    const createdAtDiff = getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt);
    if (createdAtDiff !== 0) return createdAtDiff;

    return (a.title || '').localeCompare(b.title || '');
  });
}

function getNextTaskPosition(tasks: Task[]) {
  const openTaskPositions = tasks
    .filter((task) => !task.completed && typeof task.position === 'number')
    .map((task) => task.position as number);

  if (openTaskPositions.length === 0) return 0;

  return Math.min(...openTaskPositions) - 1;
}

function reorderTasksForDrop(tasks: Task[], activeId: string, overId: string) {
  const activeTask = tasks.find((task) => task.id === activeId);
  const overTask = tasks.find((task) => task.id === overId);

  if (!activeTask || !overTask) return tasks;

  if (activeTask.completed === overTask.completed) {
    const sameStatusTasks = tasks.filter((task) => task.completed === activeTask.completed);
    const otherStatusTasks = tasks.filter((task) => task.completed !== activeTask.completed);
    const oldIndex = sameStatusTasks.findIndex((task) => task.id === activeId);
    const newIndex = sameStatusTasks.findIndex((task) => task.id === overId);
    const reorderedGroup = arrayMove(sameStatusTasks, oldIndex, newIndex);

    return activeTask.completed
      ? [...otherStatusTasks, ...reorderedGroup]
      : [...reorderedGroup, ...otherStatusTasks];
  }

  const openTasks = tasks.filter((task) => !task.completed && task.id !== activeId);
  const completedTasks = tasks.filter((task) => task.completed && task.id !== activeId);

  if (activeTask.completed) {
    completedTasks.unshift(activeTask);
  } else {
    openTasks.push(activeTask);
  }

  return [...openTasks, ...completedTasks];
}

function assignTaskPositions(tasksToPosition: Task[]) {
  return tasksToPosition.map((task, index) => ({ ...task, position: index }));
}

function moveTaskAfterToggle(tasks: Task[], taskToToggle: Task) {
  const updatedTask = { ...taskToToggle, completed: !taskToToggle.completed };
  const openTasks = tasks.filter((task) => !task.completed && task.id !== taskToToggle.id);
  const completedTasks = tasks.filter((task) => task.completed && task.id !== taskToToggle.id);

  return updatedTask.completed
    ? assignTaskPositions([...openTasks, ...completedTasks, updatedTask])
    : assignTaskPositions([updatedTask, ...openTasks, ...completedTasks]);
}

export function ProjectView({ project, user, onEditRequest, onDeleteRequest, onBack }: { 
  project: Project, 
  user: any,
  onEditRequest: (p: Project) => void,
  onDeleteRequest: (id: string) => Promise<void> | void,
  onBack: () => void 
}) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'notes' | 'tasks' | 'canvas' | 'procurement' | 'registers' | 'meetings'>('dashboard');
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchNotesQuery, setSearchNotesQuery] = useState('');
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [highlightedProcurementId, setHighlightedProcurementId] = useState<string | null>(null);
  const [highlightedScheduleItemId, setHighlightedScheduleItemId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddScheduleItem, setShowAddScheduleItem] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const taskSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Clear highlights after a short delay
  useEffect(() => {
    if (highlightedNoteId) {
      const timer = setTimeout(() => setHighlightedNoteId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedNoteId]);

  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => setHighlightedTaskId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  const deleteScheduleItem = async (id: string) => {
    if (user.uid === 'guest-123') {
      setScheduleItems(prev => prev.filter(i => i.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'scheduleItems', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `projects/${project.id}/scheduleItems/${id}`);
    }
  };

  useEffect(() => {
    if (highlightedScheduleItemId) {
      const timer = setTimeout(() => setHighlightedScheduleItemId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedScheduleItemId]);
  const [selectedNoteType, setSelectedNoteType] = useState<NoteType | 'All'>('All');

  useEffect(() => {
    if (!user) return;

    if (user.uid === 'guest-123') {
      // Initialize with some dummy data for guest if empty
      const localNotes = localStorage.getItem(`guest_notes_${project.id}`);
      if (localNotes) setNotes(JSON.parse(localNotes));
      
      const localTasks = localStorage.getItem(`guest_tasks_${project.id}`);
      if (localTasks) setTasks(sortTasks(JSON.parse(localTasks)));

      const localSchedule = localStorage.getItem(`guest_schedule_${project.id}`);
      if (localSchedule) setScheduleItems(JSON.parse(localSchedule));
      
      return;
    }

    const notesQ = query(
      collection(db, 'projects', project.id, 'notes')
    );
    const tasksQ = query(
      collection(db, 'projects', project.id, 'tasks')
    );

    const unsubNotes = onSnapshot(notesQ, (snap) => {
      const fetchedNotes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
      // Manual sorting to handle missing position fields gracefully
      fetchedNotes.sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
        if (a.position !== undefined) return -1;
        if (b.position !== undefined) return 1;
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0) || 0;
      });
      setNotes(fetchedNotes);
    }, (error) => {
      console.error("Listing Notes Error:", error);
      handleFirestoreError(error, 'list', `projects/${project.id}/notes`);
    });
    const unsubTasks = onSnapshot(tasksQ, (snap) => {
      const fetchedTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      setTasks(sortTasks(fetchedTasks));
    }, (error) => {
      console.error("Listing Tasks Error:", error);
      handleFirestoreError(error, 'list', `projects/${project.id}/tasks`);
    });

    const unsubSchedule = onSnapshot(query(
      collection(db, 'projects', project.id, 'scheduleItems'), 
      where('isConverted', '==', false)
    ), (snap) => {
      setScheduleItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem)));
    }, (error) => {
      handleFirestoreError(error, 'list', `projects/${project.id}/scheduleItems`);
    });

    const unsubMeetings = onSnapshot(query(
      collection(db, 'projects', project.id, 'meetings'),
      orderBy('date', 'desc')
    ), (snap) => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
    }, (error) => {
      handleFirestoreError(error, 'list', `projects/${project.id}/meetings`);
    });

    return () => {
      unsubNotes();
      unsubTasks();
      unsubSchedule();
      unsubMeetings();
    };
  }, [project.id, user]);

  const onNoteDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const sourceItems = [...filteredNotes];
    const [movedItem] = sourceItems.splice(sourceIndex, 1);
    sourceItems.splice(destIndex, 0, movedItem);

    // Update locally for immediate UI feedback
    const notePositions = new Map(sourceItems.map((n, i) => [n.id, i]));
    const updatedNotes = notes.map(n => {
      if (notePositions.has(n.id)) {
        return { ...n, position: notePositions.get(n.id) };
      }
      return n;
    }).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    setNotes(updatedNotes);
    if (user.uid === 'guest-123') {
      localStorage.setItem(`guest_notes_${project.id}`, JSON.stringify(updatedNotes));
    }

    if (user.uid === 'guest-123') return;

    // Persist to Firebase
    try {
      const batch = writeBatch(db);
      
      // Only update items that actually need their position changed
      let hasChanges = false;
      sourceItems.forEach((item, index) => {
        if (item.position !== index) {
          batch.update(doc(db, 'projects', project.id, 'notes', item.id), {
            position: index
          });
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        await batch.commit();
      }
    } catch (err) {
      console.error('Error saving note order:', err);
    }
  };

  const toggleTask = async (task: Task) => {
    const updatedTasks = moveTaskAfterToggle(tasks, task);

    if (user.uid === 'guest-123') {
      setTasks(updatedTasks);
      localStorage.setItem(`guest_tasks_${project.id}`, JSON.stringify(updatedTasks));
      return;
    }

    setTasks(updatedTasks);
    try {
      const batch = writeBatch(db);

      updatedTasks.forEach((updatedTask, index) => {
        batch.update(doc(db, 'projects', project.id, 'tasks', updatedTask.id), {
          position: index,
          ...(updatedTask.id === task.id ? { completed: updatedTask.completed } : {}),
        });
      });

      await batch.commit();
    } catch (err) {
      setTasks(tasks);
      handleFirestoreError(err, 'update', `projects/${project.id}/tasks/${task.id}`);
    }
  };

  const persistTaskOrder = async (orderedTasks: Task[]) => {
    if (user.uid === 'guest-123') {
      localStorage.setItem(`guest_tasks_${project.id}`, JSON.stringify(orderedTasks));
      return;
    }

    try {
      const batch = writeBatch(db);

      orderedTasks.forEach((task, index) => {
        batch.update(doc(db, 'projects', project.id, 'tasks', task.id), {
          position: index,
        });
      });

      await batch.commit();
    } catch (err) {
      console.error('Error saving task order:', err);
    }
  };

  const onTaskDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const orderedTasks = assignTaskPositions(
      reorderTasksForDrop(tasks, String(active.id), String(over.id)),
    );

    setTasks(orderedTasks);
    await persistTaskOrder(orderedTasks);
  };

  const handleBatchImport = async (extractedTasks: ExtractedTask[]) => {
    try {
      const batch = writeBatch(db);
      
      const parseDateStr = (dateStr?: string): Timestamp | null => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          // We use noon local time to avoid any timezone shifts causing day-jumping
          const d = new Date(year, month, day, 12, 0, 0);
          if (!isNaN(d.getTime())) {
            return Timestamp.fromDate(d);
          }
        }
        return null;
      };

      extractedTasks.forEach((task) => {
        // Find existing item by activityId or by title+subcontractor+division
        const existingItem = scheduleItems.find(item => 
          (task.activityId && item.activityId === task.activityId) || 
          (item.title === task.title && item.subcontractor === task.subcontractor && item.division === task.division)
        );

        const startDate = parseDateStr(task.startDate);
        const finishDate = parseDateStr(task.finishDate);
        const dueDate = parseDateStr(task.dueDate) || finishDate;

        if (existingItem) {
          // Update existing item
          batch.update(doc(db, 'projects', project.id, 'scheduleItems', existingItem.id), {
            startDate: startDate,
            finishDate: finishDate,
            dueDate: dueDate,
            activityId: task.activityId || existingItem.activityId || '',
            description: task.description || existingItem.description || '',
            updatedAt: serverTimestamp()
          });
        } else {
          // Create new item
          const newItemRef = doc(collection(db, 'projects', project.id, 'scheduleItems'));
          batch.set(newItemRef, {
            projectId: project.id,
            title: task.title,
            description: task.description || '',
            division: task.division || '',
            subcontractor: task.subcontractor || '',
            activityId: task.activityId || '',
            startDate: startDate,
            finishDate: finishDate,
            dueDate: dueDate,
            ownerId: auth.currentUser?.uid,
            createdAt: serverTimestamp(),
            isConverted: false
          });
        }
      });

      // Update project metadata
      batch.update(doc(db, 'projects', project.id), {
        lastEditedBy: auth.currentUser?.displayName || 'Alex Johnson',
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      setShowImportModal(false);
    } catch (err) {
      console.error("Batch Import Error:", err);
      handleFirestoreError(err, 'write', `projects/${project.id}/scheduleItems`);
    }
  };

  const convertScheduleItemToTask = async (item: ScheduleItem) => {
    try {
      const batch = writeBatch(db);
      
      // Mark as converted
      batch.update(doc(db, 'projects', project.id, 'scheduleItems', item.id), {
        isConverted: true
      });

      // Create task
      const newTaskRef = doc(collection(db, 'projects', project.id, 'tasks'));
      batch.set(newTaskRef, {
        projectId: project.id,
        projectName: project.name,
        title: item.title,
        description: item.description || '',
        division: item.division || '',
        subcontractor: item.subcontractor || '',
        dueDate: item.dueDate || null,
        completed: false,
        ownerId: auth.currentUser?.uid || '',
        createdAt: serverTimestamp(),
        position: getNextTaskPosition(tasks)
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'write', `projects/${project.id}/tasks`);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'notes', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `projects/${project.id}/notes/${id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'tasks', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `projects/${project.id}/tasks/${id}`);
    }
  };

  const clearLookaheadSchedule = async () => {
    try {
      const batch = writeBatch(db);
      
      // Delete all schedule items (lookahead only)
      scheduleItems.forEach(item => {
        batch.delete(doc(db, 'projects', project.id, 'scheduleItems', item.id));
      });
      
      await batch.commit();
      setShowClearConfirm(false);
    } catch (err) {
      handleFirestoreError(err, 'write', `projects/${project.id}/clear-schedule`);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchNotesQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchNotesQuery.toLowerCase()) ||
      n.type.toLowerCase().includes(searchNotesQuery.toLowerCase());
    const matchesType = selectedNoteType === 'All' || n.type === selectedNoteType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Project Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <button 
            onClick={onBack}
            className="mt-1 p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-orange-500 rounded-lg border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">Active Site</span>
              <p className="text-[10px] font-semibold text-slate-400 border-l border-slate-300 pl-2 uppercase tracking-widest">{project.location}</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">{project.name}</h1>
            <p className="text-slate-500 max-w-xl text-sm leading-relaxed mb-4">
              {project.description || 'Field operations and documentation hub.'}
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onEditRequest(project)}
                className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-orange-500 uppercase tracking-widest transition-colors group"
              >
                <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                Edit Settings
              </button>
              <div className="w-px h-3 bg-slate-200" />
              <button 
                onClick={() => onDeleteRequest(project.id)}
                className="flex items-center gap-2 text-[10px] font-bold text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors group"
              >
                <Trash className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                Delete Project
              </button>
            </div>
          </div>
        </div>
        
        {/* Removed Record Audio button from here to move it into Project Registers */}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden custom-scrollbar">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap flex items-center gap-2",
            activeTab === 'dashboard' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          <LayoutDashboard className="w-3.5 h-3.5 opacity-70" />
          Dashboard
          {activeTab === 'dashboard' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('canvas')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap flex items-center gap-2",
            activeTab === 'canvas' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          <StickyNote className="w-3.5 h-3.5 opacity-70" />
          Project Notes
          {activeTab === 'canvas' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('tasks')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap flex items-center gap-2",
            activeTab === 'tasks' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 opacity-70" />
          Tasks
          {activeTab === 'tasks' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap flex items-center gap-2",
            activeTab === 'notes' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          <FileText className="w-3.5 h-3.5 opacity-70" />
          Documentation
          {activeTab === 'notes' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('procurement')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap flex items-center gap-2",
            activeTab === 'procurement' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          <Package className="w-3.5 h-3.5 opacity-70" />
          Procurement Log
          {activeTab === 'procurement' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('registers')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap flex items-center gap-2",
            activeTab === 'registers' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          <ClipboardList className="w-3.5 h-3.5 opacity-70" />
          Project Registers
          {activeTab === 'registers' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('meetings')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap flex items-center gap-2",
            activeTab === 'meetings' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          <Users className="w-3.5 h-3.5 opacity-70" />
          Meetings
          {activeTab === 'meetings' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {/* Persistent components that should not unmount (like Audio Recorder in Registers) */}
        <div className={cn("h-[calc(100vh-280px)]", activeTab !== 'registers' && "hidden")}>
          <ProjectRegisters 
            project={project}
            user={user}
            tasks={tasks}
            scheduleItems={scheduleItems}
            onToggleTask={toggleTask}
            onEditTask={setEditingTask}
            onDeleteTask={deleteTask}
            onPromoteItem={convertScheduleItemToTask}
            onImportSchedule={() => setShowImportModal(true)}
            onClearData={() => setShowClearConfirm(true)}
            onAddScheduleItem={() => setShowAddScheduleItem(true)}
            onEditScheduleItem={setEditingScheduleItem}
          />
        </div>

        {activeTab === 'dashboard' ? (
          <ProjectDashboard 
            project={project} 
            notes={notes} 
            tasks={tasks} 
            meetings={meetings}
            scheduleItems={scheduleItems}
            user={user}
            onNavigate={(tab, id) => {
              setActiveTab(tab as any);
              if (tab === 'notes' && id) {
                setHighlightedNoteId(id);
                setSearchNotesQuery('');
                setSelectedNoteType('All');
              } else if (tab === 'tasks' && id) {
                setHighlightedTaskId(id);
              } else if (tab === 'procurement' && id) {
                setHighlightedProcurementId(id);
              } else if (tab === 'meetings' && id) {
                // Handle meeting highlight if needed
              }
            }}
          />
        ) : activeTab === 'notes' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-2xl">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Filter field notes..."
                    value={searchNotesQuery}
                    onChange={(e) => setSearchNotesQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="relative w-full sm:w-48 shrink-0">
                  <select
                    value={selectedNoteType}
                    onChange={(e) => setSelectedNoteType(e.target.value as NoteType | 'All')}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all shadow-sm appearance-none cursor-pointer pr-10"
                  >
                    <option value="All">All Categories</option>
                    {['Progress', 'Safety', 'Delivery', 'Meeting', 'Issue', 'RFI', 'Submittal', 'Punch List', 'Daily Report', 'General'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <button 
                onClick={() => setShowAddNote(true)}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Note
              </button>
            </div>
            
            {filteredNotes.length > 0 ? (
              <DragDropContext onDragEnd={onNoteDragEnd}>
                <Droppable droppableId="notes-list" direction="vertical">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex flex-col gap-6"
                    >
                      {filteredNotes.map((note, index) => (
                        // @ts-ignore
                        <Draggable key={note.id} draggableId={note.id} index={index}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps}>
                              <NoteCard 
                                note={note} 
                                dragHandleProps={provided.dragHandleProps}
                                isHighlighted={highlightedNoteId === note.id}
                                isDragging={snapshot.isDragging}
                                onDelete={() => deleteNote(note.id)} 
                                onEdit={() => setEditingNote(note)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">No site documentation found</p>
                {searchNotesQuery && <p className="text-xs text-slate-300 mt-2">Try adjusting your filter</p>}
              </div>
            )}
          </div>
        ) : activeTab === 'tasks' ? (
          <div className="space-y-6">
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                New Task
              </button>
            </div>
            {tasks.length > 0 ? (
              <DndContext
                sensors={taskSensors}
                collisionDetection={closestCenter}
                onDragEnd={onTaskDragEnd}
              >
                <SortableContext
                  items={tasks.map((task) => task.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tasks.map((task) => (
                      <React.Fragment key={task.id}>
                        <SortableTaskCard
                          task={task}
                          project={project}
                          isHighlighted={highlightedTaskId === task.id}
                          toggleTask={toggleTask}
                          setEditingTask={setEditingTask}
                          onDelete={() => deleteTask(task.id)}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">All tasks cleared</p>
              </div>
            )}
          </div>
        ) : activeTab === 'procurement' ? (
          <div className="h-[calc(100vh-280px)]">
            <ProcurementLog projectId={project.id} highlightedItemId={highlightedProcurementId} user={user} />
          </div>
        ) : activeTab === 'registers' ? (
          null
        ) : activeTab === 'meetings' ? (
          <Meetings projectId={project.id} user={user} />
        ) : (
          <ProjectCanvas projectId={project.id} user={user} />
        )}
      </div>

      {/* Add Modals */}
      <AnimatePresence>
        {showAddNote && (
          <NoteModal 
            onClose={() => setShowAddNote(false)} 
            projectId={project.id} 
            user={user}
            nextPosition={notes.length}
            onDelete={deleteNote}
          />
        )}
        {showAddTask && (
          <TaskModal 
            onClose={() => setShowAddTask(false)} 
            projectId={project.id} 
            projectName={project.name}
            user={user}
            nextPosition={getNextTaskPosition(tasks)}
            onDelete={deleteTask}
          />
        )}
        {editingNote && (
          <NoteModal 
            onClose={() => setEditingNote(null)} 
            projectId={project.id}
            user={user}
            initialData={editingNote}
            nextPosition={0}
            onDelete={deleteNote}
          />
        )}
        {editingTask && (
          <TaskModal 
            onClose={() => setEditingTask(null)} 
            projectId={project.id}
            projectName={project.name}
            user={user}
            initialData={editingTask}
            nextPosition={0}
            onDelete={deleteTask}
          />
        )}
        {showImportModal && (
          <ScheduleImportModal 
            onClose={() => setShowImportModal(false)}
            onImport={handleBatchImport}
          />
        )}
        {showAddScheduleItem && (
          <TaskModal 
            isScheduleMode
            onClose={() => setShowAddScheduleItem(false)} 
            projectId={project.id} 
            projectName={project.name}
            user={user}
            nextPosition={0}
          />
        )}
        {editingScheduleItem && (
          <TaskModal 
            isScheduleMode
            onClose={() => setEditingScheduleItem(null)} 
            projectId={project.id} 
            projectName={project.name}
            user={user}
            initialData={editingScheduleItem}
            nextPosition={0}
            onDelete={deleteScheduleItem}
          />
        )}
        {showClearConfirm && (
          <ConfirmClearModal 
            onClose={() => setShowClearConfirm(false)}
            onConfirm={clearLookaheadSchedule}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
