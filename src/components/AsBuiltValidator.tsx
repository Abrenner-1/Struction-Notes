import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCheck, 
  Sparkles, 
  Plus, 
  Search, 
  Loader2, 
  X,
  Trash2, 
  Camera, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  Wand2,
  ChevronRight,
  ClipboardList,
  Eye,
  ArrowRight,
  Split,
  Maximize2
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { validateAsBuilt } from '../services/asBuiltService';
import { cn } from '../lib/utils';
import type { AsBuiltValidation } from '../types';

interface AsBuiltValidatorProps {
  projectId: string;
  user: any;
}

export default function AsBuiltValidator({ projectId, user }: AsBuiltValidatorProps) {
  const [validations, setValidations] = useState<AsBuiltValidation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVal, setSelectedVal] = useState<AsBuiltValidation | null>(null);

  // Form State
  const [designImage, setDesignImage] = useState<string | null>(null);
  const [redlineImage, setRedlineImage] = useState<string | null>(null);

  const designInputRef = useRef<HTMLInputElement>(null);
  const redlineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_asbuilts_${projectId}`);
      if (data) {
        try {
          setValidations(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest as-built data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'as-builts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setValidations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AsBuiltValidation)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/as-builts`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'design' | 'redline') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'design') setDesignImage(reader.result as string);
      else setRedlineImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const runValidation = async () => {
    if (!designImage || !redlineImage) return;
    setIsValidating(true);

    try {
      const designBase64 = designImage.split(',')[1];
      const redlineBase64 = redlineImage.split(',')[1];
      
      const aiResult = await validateAsBuilt(designBase64, redlineBase64);
      
      const newVal: Partial<AsBuiltValidation> = {
        projectId,
        sheetNumber: aiResult.sheetNumber,
        sheetName: aiResult.sheetName,
        designImageUrl: designImage,
        redlineImageUrl: redlineImage,
        deviations: aiResult.deviations,
        cadChecklist: aiResult.cadChecklist,
        status: 'Pending',
        ownerId: user.uid,
        createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
      };

      if (user.uid === 'guest-123') {
        const itemWithId = { ...newVal, id: crypto.randomUUID() } as AsBuiltValidation;
        setValidations([itemWithId, ...validations]);
        localStorage.setItem(`guest_asbuilts_${projectId}`, JSON.stringify([itemWithId, ...validations]));
      } else {
        await addDoc(collection(db, 'projects', projectId, 'as-builts'), newVal);
      }

      setShowAddModal(false);
      setDesignImage(null);
      setRedlineImage(null);
    } catch (err) {
      console.error(err);
      alert("As-Built Validation failed. Please check your drawing quality.");
    } finally {
      setIsValidating(false);
    }
  };

  const deleteVal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.uid === 'guest-123') {
      const updated = validations.filter(v => v.id !== id);
      setValidations(updated);
      localStorage.setItem(`guest_asbuilts_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'as-builts', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'as-builts');
    }
  };

  const filteredVals = validations.filter(v => 
    v.sheetNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.sheetName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-bold">Initializing Validator...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">As-Built Validator</h2>
            <p className="text-xs text-slate-500 font-medium">Verify field redlines against design intent</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search drawings..."
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
                New Validation
              </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVals.map((val) => (
          <div 
            key={val.id}
            onClick={() => setSelectedVal(val)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                 <div className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    val.status === 'Validated' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                 )}>
                   {val.status}
                 </div>
                 <button 
                    onClick={(e) => deleteVal(val.id, e)}
                    className="p-1.5 text-slate-300 hover:text-orange-600 transition-colors"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>

              <div className="space-y-4">
                 <div>
                   <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{val.sheetNumber}</h3>
                   <p className="text-xs font-bold text-slate-500 truncate">{val.sheetName}</p>
                 </div>

                 <div className="flex -space-x-4">
                    <div className="w-12 h-12 rounded-2xl border-4 border-white bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-sm">
                       <img src={val.designImageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl border-4 border-white bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-sm">
                       <img src={val.redlineImageUrl} className="w-full h-full object-cover" />
                    </div>
                 </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{val.deviations.length} Deviations</span>
               </div>
               <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-all group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedVal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedVal(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                  <FileCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-2xl uppercase tracking-tight">{selectedVal.sheetNumber}: {selectedVal.sheetName}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">As-Built Record Validation Report</p>
                </div>
              </div>
              <button onClick={() => setSelectedVal(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12">
               {/* Visual Comparison */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Eye className="w-3 h-3" /> Original Design Sheets
                     </h4>
                     <div className="aspect-video rounded-[2rem] bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner border border-slate-100 dark:border-slate-800">
                        <img src={selectedVal.designImageUrl} className="w-full h-full object-contain" />
                     </div>
                  </div>
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-orange-600">
                        <Wand2 className="w-3 h-3" /> Field Redlines Corrected
                     </h4>
                     <div className="aspect-video rounded-[2rem] bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner border border-orange-100">
                        <img src={selectedVal.redlineImageUrl} className="w-full h-full object-contain" />
                     </div>
                  </div>
               </div>

               {/* AI Findings */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-6">
                     <div className="flex items-center gap-3 text-orange-600">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <h4 className="font-black text-xs uppercase tracking-widest">Detected Technical Deviations</h4>
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                        {selectedVal.deviations.map((dev, i) => (
                           <div key={i} className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl flex gap-6 hover:bg-white dark:bg-slate-900 hover:border-orange-200 transition-all group">
                              <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-400 shrink-0 group-hover:border-orange-100 group-hover:text-orange-400">
                                 {i + 1}
                              </div>
                              <div>
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[8px] font-black uppercase tracking-widest">{dev.category}</span>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{dev.location}</span>
                                 </div>
                                 <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{dev.description}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex items-center gap-3 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <h4 className="font-black text-xs uppercase tracking-widest">CAD Team Checklist</h4>
                     </div>
                     <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-6 space-y-4">
                        {selectedVal.cadChecklist.map((item, i) => (
                           <label key={i} className="flex items-start gap-4 cursor-pointer group">
                              <div className="mt-1 w-5 h-5 rounded-lg border-2 border-emerald-200 flex flex-shrink-0 items-center justify-center transition-colors group-hover:border-emerald-500">
                                 <CheckCircle2 className="w-3.5 h-3.5 text-transparent active:text-emerald-500" />
                              </div>
                              <span className="text-xs font-bold text-emerald-900 leading-relaxed">{item}</span>
                           </label>
                        ))}
                        <div className="pt-4 mt-4 border-t border-emerald-100">
                           <button className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                             Download CAD Package <Split className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isValidating && setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col p-8 space-y-8">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center">
                   <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-200 text-2xl uppercase tracking-tight">As-Built Comparator</h3>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Upload sheets to detect redlines</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div 
                   onClick={() => designInputRef.current?.click()}
                   className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white dark:bg-slate-900 hover:border-orange-300 transition-all group overflow-hidden relative"
                >
                   {designImage ? (
                      <img src={designImage} className="w-full h-full object-cover" />
                   ) : (
                      <>
                        <Layers className="w-8 h-8 text-slate-300 group-hover:text-orange-500 transition-colors" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Original Design Sheet</span>
                      </>
                   )}
                   <input type="file" ref={designInputRef} onChange={(e) => handleImageSelect(e, 'design')} className="hidden" accept="image/*" />
                </div>

                <div 
                   onClick={() => redlineInputRef.current?.click()}
                   className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white dark:bg-slate-900 hover:border-orange-300 transition-all group overflow-hidden relative"
                >
                   {redlineImage ? (
                      <img src={redlineImage} className="w-full h-full object-cover" />
                   ) : (
                      <>
                        <Wand2 className="w-8 h-8 text-slate-300 group-hover:text-orange-500 transition-colors" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field Redline Sheet</span>
                      </>
                   )}
                   <input type="file" ref={redlineInputRef} onChange={(e) => handleImageSelect(e, 'redline')} className="hidden" accept="image/*" />
                </div>
             </div>

             <div className="bg-orange-50 border border-orange-100 p-5 rounded-3xl flex gap-3">
                <Sparkles className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[11px] text-orange-900 font-bold leading-relaxed italic">
                  AI Inference: Gemini will perform a pixel-level comparison to find handwritten clouds and annotations, summarizing technical changes for the CAD record set.
                </p>
             </div>

             <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  disabled={isValidating}
                >
                  Cancel
                </button>
                <button 
                  onClick={runValidation}
                  disabled={!designImage || !redlineImage || isValidating}
                  className="flex-2 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Sheets...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Run AI Validation
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

// Re-defining Image fallback if needed
const ImageIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);
