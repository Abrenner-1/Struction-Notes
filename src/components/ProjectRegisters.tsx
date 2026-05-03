import React, { useState, useEffect } from 'react';
import { 
  FileText, LayoutGrid, ShieldCheck, CheckSquare, 
  AlertTriangle, Plus, Search, Filter, Clock, CheckCircle2,
  Map, CalendarDays, ClipboardList, Users, DollarSign, BarChart, BookOpen, PenTool, FolderCheck, Mic, Droplets,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, FileSpreadsheet, Trash2, FileCheck, Sparkles, Wand2, Bell, ArrowUpRight, Split
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import ThreeWeekLookAhead from './ThreeWeekLookAhead';
import AudioMixerRecorder from './AudioMixerRecorder';
import SubmittalRegister from './SubmittalRegister';
import DrawingRegister from './DrawingRegister';
import PCORegister from './PCORegister';
import ComplianceRegister from './ComplianceRegister';
import QuantityTracker from './QuantityTracker';
import PreConRegister from './PreConRegister';
import DailyReportRegister from './DailyReportRegister';
import PunchRegister from './PunchRegister';
import PermitRegister from './PermitRegister';
import SWPPPRegister from './SWPPPRegister';
import OMRegister from './OMRegister';
import AsBuiltValidator from './AsBuiltValidator';
import WarrantyRegister from './WarrantyRegister';
import type { Task, Project, ScheduleItem } from '../types';

interface ProjectRegistersProps {
  project: Project;
  user: any;
  tasks: Task[];
  scheduleItems: ScheduleItem[];
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onPromoteItem: (item: ScheduleItem) => void;
  onImportSchedule?: () => void;
  onClearData?: () => void;
  onAddScheduleItem: () => void;
  onEditScheduleItem: (item: ScheduleItem) => void;
}

export default function ProjectRegisters({ 
  project, 
  user,
  tasks, 
  scheduleItems, 
  onToggleTask, 
  onEditTask,
  onDeleteTask,
  onPromoteItem,
  onImportSchedule,
  onClearData,
  onAddScheduleItem,
  onEditScheduleItem
}: ProjectRegistersProps) {
  const [activeTab, setActiveTab] = useState('rfis');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sync state with screen size on initial load if needed, or just let user toggle
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuGroups = [
    {
      title: 'Information Flow',
      items: [
        { id: 'rfis', label: 'RFI Log', icon: FileText },
        { id: 'submittals', label: 'Submittal Register', icon: LayoutGrid },
        { id: 'drawings', label: 'Drawing Logs', icon: Map },
      ]
    },
    {
      title: 'Schedule & Logistics',
      items: [
        { id: 'lookaheads', label: '3-Week Look-Aheads', icon: CalendarDays },
      ]
    },
    {
      title: 'Quality & Field',
      items: [
        { id: 'daily-reports', label: 'Daily Reports', icon: ClipboardList },
        { id: 'audio', label: 'Daily Audio Logs', icon: Mic },
        { id: 'preinstall', label: 'Pre-Install Meetings', icon: Users },
        { id: 'punch-list', label: 'Rolling Punch List', icon: CheckSquare },
      ]
    },
    {
      title: 'Admin & Financial',
      items: [
        { id: 'pcos', label: 'Potential Change Orders', icon: DollarSign },
        { id: 'compliance', label: 'Subcontractor Compliance', icon: ShieldCheck },
        { id: 'quantity', label: 'Quantity Tracking', icon: BarChart },
      ]
    },
    {
      title: 'Safety & Environmental',
      items: [
        { id: 'permits', label: 'Permit Tracking', icon: ShieldCheck },
        { id: 'swppp', label: 'SWPPP Compliance', icon: Droplets },
      ]
    },
    {
      title: 'Project Closeout',
      items: [
        { id: 'as-builts', label: 'As-Built Validator', icon: FileCheck },
        { id: 'om-manuals', label: 'O&M Manuals', icon: BookOpen },
        { id: 'warranties', label: 'Warranties', icon: FolderCheck },
      ]
    }
  ];

  return (
    <div className="flex h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
      {/* Sidebar Navigation */}
      <motion.div 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 0 : 256, opacity: isSidebarCollapsed ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          "bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shrink-0",
          isSidebarCollapsed ? "p-0" : "p-4"
        )}
      >
        <div className="flex items-center justify-between mb-6 px-2 whitespace-nowrap">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Project Registers</h2>
          <button 
            onClick={() => setIsSidebarCollapsed(true)}
            className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-400 lg:hidden"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={`register-menu-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left whitespace-nowrap",
                        isActive 
                          ? "bg-orange-500 text-white shadow-sm" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-100"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", isActive ? "text-orange-100" : "text-slate-400")} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 overflow-hidden flex flex-col relative">
        {/* Toggle Button for Collapsed Sidebar */}
        {isSidebarCollapsed && (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute left-4 top-4 z-50 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-slate-600 dark:text-slate-400 hover:text-orange-500 transition-all hover:border-orange-200 flex items-center gap-2"
          >
            <PanelLeftOpen className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Open Menu</span>
          </motion.button>
        )}
        {activeTab === 'rfis' && <RFIRegister projectId={project.id} isSidebarCollapsed={isSidebarCollapsed} />}
        {activeTab === 'submittals' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <SubmittalRegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'drawings' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <DrawingRegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'pcos' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <PCORegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'compliance' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <ComplianceRegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'quantity' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <QuantityTracker projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'preinstall' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <PreConRegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'daily-reports' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <DailyReportRegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'punch-list' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <PunchRegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'permits' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <PermitRegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'swppp' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <SWPPPRegister projectId={project.id} user={user} />
          </div>
        )}
        { activeTab === 'om-manuals' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <OMRegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'as-builts' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <AsBuiltValidator projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'warranties' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <WarrantyRegister projectId={project.id} user={user} />
          </div>
        )}
        {activeTab === 'lookaheads' && (
          <div className={cn("p-6 overflow-y-auto h-full", isSidebarCollapsed && "pl-20 md:pl-24")}>
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">3-Week Look Ahead</h2>
                <p className="text-sm text-slate-500 mt-1">Strategic scheduling and strategic look-ahead for site operations.</p>
              </div>
              <div className="flex items-center gap-3">
                {onImportSchedule && (
                  <button 
                    onClick={onImportSchedule}
                    className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-orange-500 hover:border-orange-200 transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Import Schedule
                  </button>
                )}
                {onClearData && (
                  <button 
                    onClick={onClearData}
                    className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Data
                  </button>
                )}
              </div>
            </div>
            <ThreeWeekLookAhead 
              project={project} 
              tasks={tasks} 
              scheduleItems={scheduleItems}
              onToggleTask={onToggleTask} 
              onEditTask={onEditTask} 
              onDeleteTask={onDeleteTask}
              onPromoteItem={onPromoteItem}
              onAddScheduleItem={onAddScheduleItem}
              onEditScheduleItem={onEditScheduleItem}
            />
          </div>
        )}
        
        {/* Audio Logs Tab - PERSISTENT (not unmounted to keep recorder active) */}
        <div className={cn(
          "p-6 overflow-y-auto h-full flex flex-col items-center justify-center text-center", 
          isSidebarCollapsed && "pl-20 md:pl-24",
          activeTab !== 'audio' && "hidden"
        )}>
          <div className="max-w-xl mx-auto py-12">
            <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center shadow-lg border-4 border-white mb-8 mx-auto">
              <Mic className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Daily Audio Logs</h2>
            <p className="text-slate-500 text-center max-w-sm mx-auto text-sm leading-relaxed mb-10">
              Capture critical site discussions, safety briefings, and field notes. Recordings are automatically processed and downloaded.
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-8 rounded-3xl w-full flex flex-col items-center justify-center shadow-inner gap-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recorder Console</div>
              <AudioMixerRecorder />
            </div>
          </div>
        </div>

        {/* Other Unimplemented Tabs - Show Empty State */}
        {!['rfis', 'submittals', 'drawings', 'pcos', 'compliance', 'quantity', 'preinstall', 'daily-reports', 'punch-list', 'permits', 'swppp', 'om-manuals', 'as-builts', 'warranties', 'lookaheads', 'audio'].includes(activeTab) && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
            <div className="w-16 h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <LayoutGrid className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Module View</h3>
            <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
              Select a register from the sidebar to view details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- RFI REGISTER MOCKUP/IMPLEMENTATION ---
interface RFI {
  id: string;
  number: string;
  title: string;
  status: 'Open' | 'Closed' | 'Draft' | 'Overdue';
  ballInCourt: string;
  dueDate: string | null;
}

function RFIRegister({ projectId, isSidebarCollapsed }: { projectId: string, isSidebarCollapsed: boolean }) {
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [search, setSearch] = useState('');

  // Sample data to show architecture
  useEffect(() => {
    setRfis([
      { id: '1', number: 'RFI-001', title: 'Clash between HVAC and Structural Steel at Grid A4', status: 'Overdue', ballInCourt: 'Architect (Smith Group)', dueDate: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: '2', number: 'RFI-002', title: 'Clarification on Window Glazing Spec', status: 'Open', ballInCourt: 'Owner', dueDate: new Date(Date.now() + 86400000 * 4).toISOString() },
      { id: '3', number: 'RFI-003', title: 'Slab Edge Detail at Main Entrance', status: 'Closed', ballInCourt: 'GC', dueDate: new Date(Date.now() - 86400000 * 10).toISOString() },
    ]);
  }, [projectId]);

  return (
    <div className="flex flex-col h-full">
      <div className={cn("p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 gap-4", isSidebarCollapsed && "pl-20 md:pl-24")}>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">RFI Management</h2>
          <p className="text-sm text-slate-500 mt-1">Track Requests for Information and aging reports.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search RFIs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full md:w-64 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
            />
          </div>
          <button className="flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-all text-sm shadow-sm whitespace-nowrap">
            <Plus className="w-4 h-4" />
            New RFI
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-24">Number</th>
                <th className="p-4">Subject</th>
                <th className="p-4 w-40">Status</th>
                <th className="p-4 w-64">Ball In Court</th>
                <th className="p-4 w-32">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {rfis.map(rfi => (
                <tr key={`rfi-item-${rfi.id}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-950 transition-colors cursor-pointer group">
                  <td className="p-4 font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{rfi.number}</td>
                  <td className="p-4">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 transition-colors max-w-[400px] break-words [overflow-wrap:anywhere]">{rfi.title}</div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border",
                      rfi.status === 'Open' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      rfi.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                      rfi.status === 'Closed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    )}>
                      {rfi.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {rfi.ballInCourt.charAt(0)}
                    </div>
                    {rfi.ballInCourt}
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    {rfi.status === 'Overdue' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    ) : rfi.status === 'Closed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                    {rfi.dueDate ? format(new Date(rfi.dueDate), 'MMM dd, yyyy') : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
