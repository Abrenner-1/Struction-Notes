import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  Calendar,
  CloudRain,
  Users,
  ChevronRight,
  ClipboardCheck,
  AlertCircle,
  Wand2,
  Save,
  Clock,
  ExternalLink,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { transformDailyNotes } from '../services/dailyReportService';
import { cn } from '../lib/utils';
import type { ConstructionDailyReport } from '../types';

interface DailyReportRegisterProps {
  projectId: string;
  user: any;
}

export default function DailyReportRegister({ projectId, user }: DailyReportRegisterProps) {
  const [reports, setReports] = useState<ConstructionDailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ConstructionDailyReport | null>(null);

  // Form State
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawNotes, setRawNotes] = useState('');

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_daily_reports_${projectId}`);
      if (data) {
        try {
          setReports(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest daily report data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'daily-reports'),
      orderBy('reportDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ConstructionDailyReport)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/daily-reports`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleTransformAndSave = async () => {
    if (!rawNotes.trim() || !reportDate) return;
    setIsGenerating(true);

    try {
      const aiResult = await transformDailyNotes(rawNotes);
      
      const newReport: Partial<ConstructionDailyReport> = {
        projectId,
        reportDate,
        rawNotes,
        narrativeWorkAccomplished: aiResult.narrativeWorkAccomplished,
        narrativeDelaysIssues: aiResult.narrativeDelaysIssues,
        suggestedActionItems: aiResult.suggestedActionItems,
        weatherCondition: aiResult.weatherCondition,
        manpowerCount: aiResult.manpowerCount,
        ownerId: user.uid,
        createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
      };

      if (user.uid === 'guest-123') {
        const itemWithId = { ...newReport, id: crypto.randomUUID() } as ConstructionDailyReport;
        const updated = [itemWithId, ...reports].sort((a,b) => b.reportDate.localeCompare(a.reportDate));
        setReports(updated);
        localStorage.setItem(`guest_daily_reports_${projectId}`, JSON.stringify(updated));
      } else {
        await addDoc(collection(db, 'projects', projectId, 'daily-reports'), newReport);
      }

      setShowAddModal(false);
      setRawNotes('');
      setReportDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error(err);
      alert("AI Transformation failed. Check your notes and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.uid === 'guest-123') {
      const updated = reports.filter(r => r.id !== id);
      setReports(updated);
      localStorage.setItem(`guest_daily_reports_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'daily-reports', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'daily-reports');
    }
  };

  const filteredReports = reports.filter(r => 
    r.reportDate.includes(searchQuery) ||
    r.narrativeWorkAccomplished.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading Daily Reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Daily Construction Reports</h2>
            <p className="text-xs text-slate-500">Transform field notes into professional records</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-all shadow-sm shadow-orange-100"
          >
            <Plus className="w-4 h-4" />
            New Daily Report
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredReports.map((report) => (
          <div 
            key={report.id}
            onClick={() => setSelectedReport(report)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{new Date(report.reportDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {report.manpowerCount || 0} Manpower
                    </div>
                    {report.weatherCondition && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <CloudRain className="w-3.5 h-3.5" />
                        {report.weatherCondition}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden lg:block max-w-sm">
                   <p className="text-xs text-slate-500 italic line-clamp-1">"{report.narrativeWorkAccomplished}"</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => deleteReport(report.id, e)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-all group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 opacity-20" />
             </div>
             <div className="text-center">
                <p className="font-bold text-slate-600 dark:text-slate-400">No Daily Reports Yet</p>
                <p className="text-xs max-w-xs mx-auto">Click 'New Daily Report' and paste your field notes to see the AI transformer in action.</p>
             </div>
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedReport(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl">{new Date(selectedReport.reportDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-orange-600 font-bold">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{selectedReport.manpowerCount} Field Staff</span>
                    <span className="flex items-center gap-1"><CloudRain className="w-3.5 h-3.5" />{selectedReport.weatherCondition}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              {/* Narrative Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <ClipboardCheck className="w-5 h-5 shrink-0" />
                    <h4 className="font-black text-sm uppercase tracking-wider">Work Accomplished</h4>
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedReport.narrativeWorkAccomplished}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-rose-600">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <h4 className="font-black text-sm uppercase tracking-wider">Delays & Issues</h4>
                  </div>
                  <div className="p-5 bg-rose-50/50 border border-rose-100 rounded-2xl">
                    <p className="text-sm text-rose-900 leading-relaxed whitespace-pre-wrap">{selectedReport.narrativeDelaysIssues || 'No significant delays reported.'}</p>
                  </div>
                </div>
              </div>

              {/* Action Items */}
              <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Wand2 className="w-5 h-5 shrink-0" />
                    <h4 className="font-black text-sm uppercase tracking-wider">Suggested Actions for PE</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedReport.suggestedActionItems.map((action, i) => (
                      <div key={i} className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 text-xs font-bold text-orange-900 items-start">
                        <div className="w-5 h-5 bg-orange-200 text-orange-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i+1}</div>
                        {action}
                      </div>
                    ))}
                  </div>
              </div>

              {/* Original Notes (Audit Trail) */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Original Field Notes</h4>
                 <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl italic text-xs text-slate-500">
                    {selectedReport.rawNotes}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isGenerating && setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Daily Log Transformer</h3>
                  <p className="text-xs text-slate-500">Convert field bullets to professional narratives</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400"
                disabled={isGenerating}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Report Date</label>
                <input 
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Field Notes (Bullet points, informal context)</label>
                <textarea 
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="e.g. 10 guys onsite today. Poured 50CY concrete. Crane broke at 2PM (mechanical). Rainy morning, delayed start by 1 hr..."
                  className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white dark:bg-slate-900 transition-all text-sm outline-none leading-relaxed"
                />
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3">
                <Wand2 className="w-5 h-5 text-orange-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] text-orange-900 font-bold">
                    AI Transformation Engine
                  </p>
                  <p className="text-[10px] text-orange-700 leading-relaxed">
                    Gemini will expand your notes, isolate delays, estimate manpower, and suggest corrective actions for the engineering team.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button 
                onClick={handleTransformAndSave}
                disabled={isGenerating || !rawNotes.trim()}
                className={cn(
                  "px-8 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2",
                  isGenerating && "opacity-80"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transforming Notes...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Save & Transform
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
