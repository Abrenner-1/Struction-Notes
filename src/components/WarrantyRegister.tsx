import React, { useState, useEffect } from 'react';
import { 
  FolderCheck, 
  Sparkles, 
  Plus, 
  Search, 
  Loader2, 
  X,
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Building2,
  ListChecks,
  ClipboardList,
  Wand2,
  ChevronRight,
  ShieldCheck,
  History,
  Bell,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { parseWarrantyLetter } from '../services/warrantyService';
import { cn } from '../lib/utils';
import type { Warranty } from '../types';

interface WarrantyRegisterProps {
  projectId: string;
  user: any;
}

export default function WarrantyRegister({ projectId, user }: WarrantyRegisterProps) {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);

  // Form State
  const [manualText, setManualText] = useState('');

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_warranties_${projectId}`);
      if (data) {
        try {
          setWarranties(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest warranty data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'warranties'),
      orderBy('endDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWarranties(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Warranty)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/warranties`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleIngestion = async () => {
    if (!manualText.trim()) return;
    setIsAnalyzing(true);

    try {
      const aiResult = await parseWarrantyLetter(manualText);
      
      const newWarranty: Partial<Warranty> = {
        projectId,
        subcontractor: aiResult.subcontractor,
        scopeOfWork: aiResult.scopeOfWork,
        startDate: aiResult.startDate,
        endDate: aiResult.endDate,
        isExtended: aiResult.isExtended,
        exclusions: aiResult.exclusions,
        status: calculateStatus(aiResult.endDate),
        ownerId: user.uid,
        createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
      };

      if (user.uid === 'guest-123') {
        const itemWithId = { ...newWarranty, id: crypto.randomUUID() } as Warranty;
        const updated = [itemWithId, ...warranties].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
        setWarranties(updated);
        localStorage.setItem(`guest_warranties_${projectId}`, JSON.stringify(updated));
      } else {
        await addDoc(collection(db, 'projects', projectId, 'warranties'), newWarranty);
      }

      setShowAddModal(false);
      setManualText('');
    } catch (err) {
      console.error(err);
      alert("AI Ingestion failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateStatus = (endDate: string): Warranty['status'] => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays <= 60) return 'Expiring Soon';
    return 'Active';
  };

  const deleteWarranty = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.uid === 'guest-123') {
      const updated = warranties.filter(w => w.id !== id);
      setWarranties(updated);
      localStorage.setItem(`guest_warranties_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'warranties', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'warranties');
    }
  };

  const filteredWarranties = warranties.filter(w => 
    w.subcontractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.scopeOfWork.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const expiringSoonCount = warranties.filter(w => w.status === 'Expiring Soon').length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-bold">Accessing Warranty Safe...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner for Expiring Warranties */}
      {expiringSoonCount > 0 && (
         <div className="bg-orange-50 border border-orange-200 rounded-3xl p-5 flex items-center justify-between shadow-sm shadow-orange-100 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center animate-pulse">
                  <Bell className="w-6 h-6" />
               </div>
               <div>
                  <h4 className="font-black text-orange-900 text-sm uppercase tracking-tight">Warranty Walk-through Required</h4>
                  <p className="text-xs text-orange-700 font-medium">{expiringSoonCount} warranties are expiring within the next 60 days. Schedule a final site walk-through.</p>
               </div>
            </div>
            <button className="px-4 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all">
               Schedule Now
            </button>
         </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Project Warranties</h2>
            <p className="text-xs text-slate-500 font-medium">Track subcontractor & manufacturer coverage</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search subcontractors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64 shadow-sm"
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
            >
              <Plus className="w-4 h-4" />
              New Warranty
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarranties.map((w) => (
          <div 
            key={w.id}
            onClick={() => setSelectedWarranty(w)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            {w.isExtended && (
               <div className="absolute -top-1 -right-1">
                  <div className="bg-orange-600 text-white text-[8px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-bl-xl shadow-lg flex items-center gap-1">
                     <Sparkles className="w-2.5 h-2.5" /> Extended
                  </div>
               </div>
            )}

            <div className="flex items-center justify-between mb-4">
               <div className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                  w.status === 'Active' ? "bg-emerald-100 text-emerald-700" : 
                  w.status === 'Expiring Soon' ? "bg-amber-100 text-amber-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
               )}>
                 {w.status}
               </div>
               <button 
                  onClick={(e) => deleteWarranty(w.id, e)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>

            <div className="space-y-4">
               <div>
                 <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors uppercase tracking-tight leading-tight">{w.subcontractor}</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{w.scopeOfWork}</p>
               </div>

               <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Expires</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{new Date(w.endDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Coverage</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                       {Math.ceil((new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} Year
                    </p>
                  </div>
               </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-1.5 font-black text-[10px] text-slate-400 uppercase">
                  <ClipboardList className="w-3.5 h-3.5 text-slate-300" />
                  {w.exclusions.length} Exclusions
               </div>
               <div className="flex items-center gap-1 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                  Review <ArrowUpRight className="w-3.5 h-3.5" />
               </div>
            </div>
          </div>
        ))}

        {filteredWarranties.length === 0 && (
           <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                 <ShieldCheck className="w-8 h-8 opacity-20" />
              </div>
              <div className="text-center font-bold">
                 <p className="text-slate-600 dark:text-slate-400 uppercase tracking-tight text-lg">No Warranties Found</p>
                 <p className="text-xs font-medium max-w-xs mx-auto">Ingest subcontractor warranty letters to automatically track project coverage.</p>
              </div>
           </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedWarranty(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-2xl uppercase tracking-tight">{selectedWarranty.subcontractor}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedWarranty.scopeOfWork} Warranty</span>
                    <span className={cn(
                       "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                       selectedWarranty.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>{selectedWarranty.status}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedWarranty(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Warranty Period</h4>
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 relative group">
                           <div className="flex justify-between items-center relative z-10">
                              <div>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Effective Date</p>
                                 <p className="font-black text-slate-700 dark:text-slate-300">{new Date(selectedWarranty.startDate).toLocaleDateString()}</p>
                              </div>
                              <div className="h-0.5 flex-1 mx-6 bg-slate-200 relative">
                                 <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm"></div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">End Date</p>
                                 <p className="font-black text-slate-700 dark:text-slate-300">{new Date(selectedWarranty.endDate).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <div className="mt-8 pt-6 border-t border-slate-200/50 flex justify-center">
                              <div className="text-center">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Coverage Span</p>
                                 <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                                    {Math.ceil((new Date(selectedWarranty.endDate).getTime() - new Date(selectedWarranty.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} Years
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                           <Sparkles className="w-5 h-5 text-orange-600" />
                           <h4 className="font-black text-[10px] uppercase tracking-widest text-orange-900">Coverage Analysis</h4>
                        </div>
                        <p className="text-xs font-bold text-orange-800 leading-relaxed italic">
                           AI identified this as an {selectedWarranty.isExtended ? 'Extended' : 'Standard'} warranty. The coverage was extracted from the subcontractor's final closeout submittal letter.
                        </p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div>
                        <div className="flex items-center justify-between mb-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specific Exclusions</h4>
                           <span className="text-[8px] font-black px-2 py-0.5 bg-rose-50 text-rose-600 rounded">Risk Factor</span>
                        </div>
                        <div className="space-y-2">
                           {selectedWarranty.exclusions.map((exclusion, i) => (
                              <div key={i} className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-rose-200 transition-all">
                                 <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                                 <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{exclusion}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <button className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:bg-slate-950 transition-all shadow-sm">
                     View Letter <FileText className="w-4 h-4 inline ml-2" />
                  </button>
                  <button className="px-6 py-3 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-100">
                     Issue Correction Ticket
                  </button>
               </div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  ID: {selectedWarranty.id.slice(0, 8)}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isAnalyzing && setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-200 text-2xl uppercase tracking-tight">AI Warranty Ingestion</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Automatic extraction from text</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors"
                disabled={isAnalyzing}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest px-1">Paste Warranty Letter Text</label>
                <textarea 
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste the subcontractor warranty agreement or letter here..."
                  className="w-full h-80 p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-[2rem] text-sm outline-none focus:ring-4 focus:ring-orange-500/10 focus:bg-white dark:bg-slate-900 transition-all leading-relaxed font-medium"
                />
              </div>

              <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex gap-4">
                 <Wand2 className="w-6 h-6 text-orange-600 shrink-0" />
                 <div>
                    <p className="text-xs font-black text-orange-900 uppercase tracking-widest mb-1">Intelligent Extraction</p>
                    <p className="text-[11px] text-orange-800 font-bold leading-relaxed italic">Gemini will identify start dates, calculate coverage duration, and highlight high-risk exclusions that could void your claim.</p>
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-4">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:bg-slate-950 transition-all"
                disabled={isAnalyzing}
              >
                Cancel
              </button>
              <button 
                onClick={handleIngestion}
                disabled={!manualText.trim() || isAnalyzing}
                className="flex-2 py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extracting Logic...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Ingest Warranty
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
