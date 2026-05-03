import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Loader2, 
  X,
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Building2,
  Mail,
  Copy,
  Wand2,
  ChevronRight,
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { processInspectionResult } from '../services/permitService';
import { cn } from '../lib/utils';
import type { Permit } from '../types';

interface PermitRegisterProps {
  projectId: string;
  user: any;
}

export default function PermitRegister({ projectId, user }: PermitRegisterProps) {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);

  // Form State
  const [permitNumber, setPermitNumber] = useState('');
  const [agency, setAgency] = useState('');
  const [status, setStatus] = useState<Permit['status']>('Pending');

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_permits_${projectId}`);
      if (data) {
        try {
          setPermits(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest permit data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'permits'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPermits(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Permit)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/permits`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleAddPermit = async () => {
    if (!permitNumber || !agency) return;

    const newPermit: Partial<Permit> = {
      projectId,
      permitNumber,
      agency,
      status,
      ownerId: user.uid,
      createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
    };

    if (user.uid === 'guest-123') {
      const itemWithId = { ...newPermit, id: crypto.randomUUID() } as Permit;
      const updated = [itemWithId, ...permits];
      setPermits(updated);
      localStorage.setItem(`guest_permits_${projectId}`, JSON.stringify(updated));
    } else {
      await addDoc(collection(db, 'projects', projectId, 'permits'), newPermit);
    }

    setShowAddModal(false);
    setPermitNumber('');
    setAgency('');
  };

  const handleInspectionUpdate = async (permit: Permit, result: string) => {
    setIsProcessing(true);
    try {
      const aiResult = await processInspectionResult(permit.permitNumber, result);
      
      const updates: Partial<Permit> = {
        lastInspectionResult: result,
        lastInspectionDate: new Date().toISOString().split('T')[0],
        status: aiResult.isFailed ? 'Failed Inspection' : 'Active',
        correctionRequirements: aiResult.correctionRequirements,
        reinspectionDraftEmail: aiResult.draftReinspectionRequest
      };

      if (user.uid === 'guest-123') {
        const updated = permits.map(p => p.id === permit.id ? { ...p, ...updates } : p);
        setPermits(updated);
        localStorage.setItem(`guest_permits_${projectId}`, JSON.stringify(updated));
        setSelectedPermit({ ...permit, ...updates });
      } else {
        await updateDoc(doc(db, 'projects', projectId, 'permits', permit.id), updates);
        setSelectedPermit({ ...permit, ...updates });
      }
    } catch (err) {
      console.error(err);
      alert("AI Processing of inspection result failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const deletePermit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.uid === 'guest-123') {
      const updated = permits.filter(p => p.id !== id);
      setPermits(updated);
      localStorage.setItem(`guest_permits_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'permits', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'permits');
    }
  };

  const filteredPermits = permits.filter(p => 
    p.permitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.agency.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Permit Tracker</h2>
            <p className="text-xs text-slate-500">Monitor inspections and compliance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search permits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64 shadow-sm"
                />
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Permit
              </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPermits.map((permit) => (
          <div 
            key={permit.id}
            onClick={() => setSelectedPermit(permit)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className={cn(
              "absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-110 transition-transform",
              permit.status === 'Active' ? "bg-emerald-500" : 
              permit.status === 'Failed Inspection' ? "bg-rose-500" : "bg-blue-500"
            )}></div>

            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                permit.status === 'Active' ? "bg-emerald-100 text-emerald-700" : 
                permit.status === 'Failed Inspection' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
              )}>
                {permit.status}
              </div>
              <button 
                onClick={(e) => deletePermit(permit.id, e)}
                className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Permit No.</p>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors">{permit.permitNumber}</h3>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Issuing Agency</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {permit.agency}
                </p>
              </div>

              {permit.lastInspectionDate && (
                <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{permit.lastInspectionDate}</span>
                  <span className="text-orange-600">Details <ChevronRight className="w-3.5 h-3.5 inline" /></span>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredPermits.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 opacity-20" />
             </div>
             <div className="text-center font-bold">
                <p className="text-slate-600 dark:text-slate-400">No Permits Tracked</p>
                <p className="text-xs font-medium">Add permits to start monitoring AHJ compliance.</p>
             </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPermit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPermit(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-2xl uppercase tracking-tight">{selectedPermit.permitNumber}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedPermit.agency}</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                      selectedPermit.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                    )}>{selectedPermit.status}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedPermit(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Record Inspection Result</h4>
                    <div className="flex flex-col gap-3">
                      <textarea 
                        placeholder="Paste inspection comments or result here..."
                        className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleInspectionUpdate(selectedPermit, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button 
                         onClick={(e) => {
                            const val = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                            handleInspectionUpdate(selectedPermit, val.value);
                            val.value = '';
                         }}
                         disabled={isProcessing}
                         className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
                      >
                         {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                         {isProcessing ? "AI Analyzing..." : "Analyze Result"}
                      </button>
                    </div>
                  </div>

                  {selectedPermit.lastInspectionResult && (
                    <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Latest Result ({selectedPermit.lastInspectionDate})</p>
                       <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">"{selectedPermit.lastInspectionResult}"</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {selectedPermit.correctionRequirements && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-rose-600">
                        <AlertCircle className="w-5 h-5" />
                        <h4 className="font-black text-[10px] uppercase tracking-widest">Correction Requirements</h4>
                      </div>
                      <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl">
                         <p className="text-sm font-bold text-rose-900 leading-relaxed">{selectedPermit.correctionRequirements}</p>
                      </div>
                    </div>
                  )}

                  {selectedPermit.reinspectionDraftEmail && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Mail className="w-5 h-5" />
                        <h4 className="font-black text-[10px] uppercase tracking-widest">AI Re-inspection Draft</h4>
                      </div>
                      <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl relative group">
                         <pre className="text-xs font-medium text-emerald-900 leading-relaxed whitespace-pre-wrap font-sans">{selectedPermit.reinspectionDraftEmail}</pre>
                         <button 
                            onClick={() => {
                              navigator.clipboard.writeText(selectedPermit.reinspectionDraftEmail!);
                            }}
                            className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-900 text-emerald-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Copy className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden p-8 space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xl">Track New Permit</h3>
                <p className="text-sm text-slate-500 font-medium">Register a permit for monitoring.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Permit Number</label>
                  <input 
                    type="text"
                    value={permitNumber}
                    onChange={(e) => setPermitNumber(e.target.value)}
                    placeholder="e.g. BLD2024-00123"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                  />
                </div>
  
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Agency</label>
                  <input 
                    type="text"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    placeholder="e.g. City of Seattle DCI"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                  />
                </div>
  
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Current Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                  >
                  <option value="Pending">Pending Approval</option>
                  <option value="Active">Active / Issued</option>
                  <option value="Closed">Closed / Finaled</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddPermit}
                disabled={!permitNumber || !agency}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all disabled:opacity-50 shadow-lg shadow-orange-100"
              >
                Save Permit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
