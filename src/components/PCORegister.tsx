import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  DollarSign, 
  Tag, 
  ExternalLink,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { formulatePCO } from '../services/pcoService';
import { cn } from '../lib/utils';
import type { PCO } from '../types';

interface PCORegisterProps {
  projectId: string;
  user: any;
}

export default function PCORegister({ projectId, user }: PCORegisterProps) {
  const [pcos, setPcos] = useState<PCO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormulating, setIsFormulating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [rawDesc, setRawDesc] = useState('');
  const [cost, setCost] = useState('');
  const [sub, setSub] = useState('');

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_pcos_${projectId}`);
      if (data) {
        try {
          setPcos(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest PCO data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'pcos')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPcos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PCO)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/pcos`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleFormulate = async () => {
    if (!rawDesc.trim()) return;
    setIsFormulating(true);
    try {
      const aiResult = await formulatePCO(rawDesc);
      
      const pcoNumber = `PCO-${(pcos.length + 1).toString().padStart(3, '0')}`;
      
      const newPco: Partial<PCO> = {
        projectId,
        pcoNumber,
        title: aiResult.title || newTitle || 'Untitled Change',
        rawDescription: rawDesc,
        professionalDescription: aiResult.professionalDescription,
        category: aiResult.category as any,
        status: 'Draft',
        suggestedReferences: aiResult.suggestedReferences,
        estimatedCost: cost ? parseFloat(cost) : 0,
        subcontractor: sub,
        ownerId: user.uid,
        createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
      };

      if (user.uid === 'guest-123') {
        const itemWithId = { ...newPco, id: crypto.randomUUID() } as PCO;
        const updated = [itemWithId, ...pcos];
        setPcos(updated);
        localStorage.setItem(`guest_pcos_${projectId}`, JSON.stringify(updated));
      } else {
        await addDoc(collection(db, 'projects', projectId, 'pcos'), newPco);
      }

      setShowAddModal(false);
      setRawDesc('');
      setNewTitle('');
      setCost('');
      setSub('');
    } catch (err) {
      console.error(err);
      alert("Failed to formulate PCO. Check AI service.");
    } finally {
      setIsFormulating(false);
    }
  };

  const deletePco = async (id: string) => {
    if (user.uid === 'guest-123') {
      const updated = pcos.filter(p => p.id !== id);
      setPcos(updated);
      localStorage.setItem(`guest_pcos_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'pcos', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'pcos');
    }
  };

  const filteredPcos = pcos.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.pcoNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.subcontractor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.pcoNumber.localeCompare(a.pcoNumber));

  const totalExposure = filteredPcos.reduce((acc, p) => acc + (p.estimatedCost || 0), 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading Change Orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Potential Change Orders</h2>
            <p className="text-xs text-slate-500">Track financial exposure and contract impacts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search PCOs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-all shadow-sm shadow-orange-100"
          >
            <Plus className="w-4 h-4" />
            AI Formulate PCO
          </button>
        </div>
      </div>

      {/* Exposure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Potential Exposure</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">${totalExposure.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items in Draft</div>
          <div className="text-2xl font-black text-amber-600">{filteredPcos.filter(p => p.status === 'Draft').length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items Approved</div>
          <div className="text-2xl font-black text-emerald-600">{filteredPcos.filter(p => p.status === 'Approved').length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">PCO #</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">References</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Est. Cost</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPcos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    No PCOs tracked. Click "AI Formulate PCO" to draft your first change.
                  </td>
                </tr>
              ) : (
                filteredPcos.map((pco) => (
                  <tr key={pco.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{pco.pcoNumber}</td>
                    <td className="px-6 py-4 max-w-sm">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{pco.title}</div>
                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed italic">
                        "{pco.professionalDescription}"
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        pco.category === 'Design Gap' ? 'bg-red-50 text-red-600' :
                        pco.category === 'Field Condition' ? 'bg-blue-50 text-blue-600' :
                        'bg-amber-50 text-amber-600'
                      )}>
                        {pco.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <Tag className="w-3 h-3" />
                        {pco.suggestedReferences}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100">
                      ${pco.estimatedCost?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border",
                        pco.status === 'Draft' ? 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-100 dark:border-slate-800' :
                        pco.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                      )}>
                        {pco.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deletePco(pco.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isFormulating && setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">PCO Formulator</h3>
                  <p className="text-xs text-slate-500">AI-driven contractual language generation</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Raw Field Description</label>
                <textarea 
                  value={rawDesc}
                  onChange={(e) => setRawDesc(e.target.value)}
                  placeholder="e.g. Rerouted 4-inch pipe around new ductwork near beam line 4"
                  className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white dark:bg-slate-900 transition-all text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Est. Cost Impact</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="5000"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Subcontractor</label>
                  <input 
                    type="text"
                    value={sub}
                    onChange={(e) => setSub(e.target.value)}
                    placeholder="e.g. Apex Mechanical"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[11px] text-orange-800 leading-relaxed italic">
                  <strong>How it works:</strong> Gemini will analyze your description and draft a formal contractual justification, categorize the risk, and suggest references to existing docs like RFIs or Drawings.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
               <button 
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleFormulate}
                disabled={isFormulating || !rawDesc.trim()}
                className={cn(
                  "px-8 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2",
                  isFormulating && "opacity-80"
                )}
              >
                {isFormulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Formulating Change...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Draft PCO
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
