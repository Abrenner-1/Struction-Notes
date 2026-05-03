import React, { useState, useEffect } from 'react';
import { 
  FileSearch, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PhoneCall, 
  ChevronRight,
  Filter,
  Search,
  Plus,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { collection, query, where, addDoc, serverTimestamp, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { analyzeSubmittalLog } from '../services/submittalService';
import { cn } from '../lib/utils';
import type { Submittal } from '../types';

interface SubmittalRegisterProps {
  projectId: string;
  user: any;
}

export default function SubmittalRegister({ projectId, user }: SubmittalRegisterProps) {
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [analysisResult, setAnalysisResult] = useState<{ peFollowUpSummary: string } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawInput, setRawInput] = useState('');

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_submittals_${projectId}`);
      if (data) {
        try {
          setSubmittals(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest submittal data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'submittals')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmittals(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Submittal)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/submittals`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleAnalzeAndImport = async () => {
    if (!rawInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeSubmittalLog(rawInput);
      setAnalysisResult({ peFollowUpSummary: result.peFollowUpSummary });
      
      const newItems = result.items.map((item: any) => ({
        ...item,
        projectId,
        ownerId: user.uid,
        status: 'Pending',
        createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } : serverTimestamp()
      }));

      if (user.uid === 'guest-123') {
        const itemsWithIds = newItems.map((item: any) => ({ ...item, id: crypto.randomUUID() }));
        const updated = [...itemsWithIds, ...submittals];
        setSubmittals(updated);
        localStorage.setItem(`guest_submittals_${projectId}`, JSON.stringify(updated));
      } else {
        // Batch add
        try {
          for (const item of newItems) {
            await addDoc(collection(db, 'projects', projectId, 'submittals'), item);
          }
        } catch (err) {
          handleFirestoreError(err, 'write', `projects/${projectId}/submittals`);
        }
      }
      
      setShowImportModal(false);
      setRawInput('');
    } catch (err) {
      console.error(err);
      alert("Failed to analyze submittal log. Check your Gemini API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteSubmittal = async (id: string) => {
    if (user.uid === 'guest-123') {
      const updated = submittals.filter(s => s.id !== id);
      setSubmittals(updated);
      localStorage.setItem(`guest_submittals_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'submittals', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'submittals');
    }
  };

  const filteredSubmittals = submittals.filter(s => 
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.specSection.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.subcontractor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Review': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800';
    }
  };

  const getTrafficLight = (status: string | undefined) => {
    switch (status) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-amber-400';
      case 'green': return 'bg-emerald-500';
      default: return 'bg-slate-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading Submittal Log...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Submittal Register</h2>
            <p className="text-xs text-slate-500">Track approvals and procurement float</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search submittals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64"
            />
          </div>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4" />
            AI Import & Analyze
          </button>
        </div>
      </div>

      {/* Hero Analysis Stats (If available) */}
      {analysisResult && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <PhoneCall className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-orange-900">PE Follow-up Action Plan</h3>
            </div>
            <div className="text-sm text-orange-800 whitespace-pre-wrap leading-relaxed">
              {analysisResult.peFollowUpSummary}
            </div>
          </div>
          <div className="md:w-px md:bg-orange-200" />
          <div className="flex flex-col justify-center items-center gap-2 px-4">
            <div className="text-xs font-bold text-orange-400 uppercase tracking-widest">At Risk Items</div>
            <div className="text-4xl font-black text-orange-900">
              {submittals.filter(s => s.trafficLightStatus === 'red').length}
            </div>
            <div className="text-xs text-orange-700">Require Immediate Call</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Spec Section</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subcontractor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Install Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Procurement Float</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmittals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    No submittals found. Use the AI Import to populate this list.
                  </td>
                </tr>
              ) : (
                filteredSubmittals.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {sub.specSection}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{sub.description}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Priority: {sub.followUpPriority}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{sub.subcontractor}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium">{sub.scheduledInstallDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", getTrafficLight(sub.trafficLightStatus))} />
                          <span className={cn(
                            "text-sm font-bold",
                            sub.trafficLightStatus === 'red' ? 'text-red-600' : 
                            sub.trafficLightStatus === 'yellow' ? 'text-amber-600' : 'text-emerald-600'
                          )}>
                            {sub.procurementFloat} days
                          </span>
                        </div>
                        <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full w-24 overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-1000", getTrafficLight(sub.trafficLightStatus))} 
                            style={{ width: `${Math.min(100, Math.max(0, (sub.procurementFloat || 0) * 2))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors", getStatusColor(sub.status))}>
                        {sub.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteSubmittal(sub.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isAnalyzing && setShowImportModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Import Submittal Log</h3>
                  <p className="text-xs text-slate-500">Paste your log content for AI analysis</p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Log Content (Paste text from Excel/PDF)</label>
              <textarea 
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="024119, Selective Demolition, Demo Kings, 2024-06-15, 4 weeks..."
                className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white dark:bg-slate-900 transition-all font-mono text-xs leading-relaxed outline-none"
              />
              <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-xs text-orange-800 leading-relaxed">
                  <strong>AI Analysis:</strong> Gemini will automatically calculate procurement float, determine lead time risks, and highlight items requiring immediate vendor follow-up.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowImportModal(false)}
                disabled={isAnalyzing}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleAnalzeAndImport}
                disabled={isAnalyzing || !rawInput.trim()}
                className={cn(
                  "px-8 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2",
                  isAnalyzing && "opacity-80"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Log...
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    Analyze & Import
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
