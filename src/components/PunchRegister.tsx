import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  Sparkles, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  Camera,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  MoreVertical,
  ArrowUpRight,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { analyzePunchPhoto } from '../services/punchService';
import { cn } from '../lib/utils';
import type { PunchItem } from '../types';

interface PunchRegisterProps {
  projectId: string;
  user: any;
}

export default function PunchRegister({ projectId, user }: PunchRegisterProps) {
  const [items, setItems] = useState<PunchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Pending' | 'Closed'>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PunchItem | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_punch_${projectId}`);
      if (data) {
        try {
          setItems(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest punch data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'punch-list'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PunchItem)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/punch-list`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const aiResult = await analyzePunchPhoto(base64);
        
        const newItem: Partial<PunchItem> = {
          projectId,
          description: aiResult.description,
          location: aiResult.location,
          csiDivision: aiResult.csiDivision,
          responsibleSub: aiResult.responsibleSub,
          coordinates: aiResult.coordinates,
          status: 'Open',
          imageUrl: reader.result as string, // Realistically you'd upload to Storage
          ownerId: user.uid,
          createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
        };

        if (user.uid === 'guest-123') {
          const itemWithId = { ...newItem, id: crypto.randomUUID() } as PunchItem;
          const updated = [itemWithId, ...items];
          setItems(updated);
          localStorage.setItem(`guest_punch_${projectId}`, JSON.stringify(updated));
        } else {
          await addDoc(collection(db, 'projects', projectId, 'punch-list'), newItem);
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        alert("AI Image Analysis failed.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.uid === 'guest-123') {
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      localStorage.setItem(`guest_punch_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'punch-list', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'punch-list');
    }
  };

  const updateStatus = async (item: PunchItem, newStatus: PunchItem['status']) => {
    if (user.uid === 'guest-123') {
      const updated = items.map(i => i.id === item.id ? { ...i, status: newStatus } : i);
      setItems(updated);
      localStorage.setItem(`guest_punch_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await updateDoc(doc(db, 'projects', projectId, 'punch-list', item.id), { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, 'update', 'punch-list');
    }
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = i.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         i.responsibleSub.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading Punch List...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Site Punch List</h2>
            <p className="text-xs text-slate-500">Track and close out site deficiencies</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64 shadow-sm font-medium"
            />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
            accept="image/*" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {isAnalyzing ? "Analyzing..." : "Image-to-Punch"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
        {['All', 'Open', 'Pending', 'Closed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as any)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
              statusFilter === status 
                ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"
            )}
          >
            {status}
            <span className="ml-2 opacity-50">
              {status === 'All' ? items.length : items.filter(i => i.status === status).length}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedItem(item)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col"
          >
            <div className="relative h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <ImageIcon className="w-12 h-12 text-slate-300" />
              )}
              <div className="absolute top-3 left-3">
                <div className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm",
                  item.status === 'Open' ? "bg-amber-500 text-white" :
                  item.status === 'Pending' ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                )}>
                  {item.status}
                </div>
              </div>
              <button 
                onClick={(e) => deleteItem(item.id, e)}
                className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-md text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors uppercase text-sm tracking-tight">{item.description}</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    {item.location}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    {item.responsibleSub}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[10px] text-slate-400">
                  <Sparkles className="w-3 h-3 text-orange-400" />
                  {item.csiDivision}
                </div>
                <div className="flex items-center gap-1 text-orange-600 font-black text-[10px] uppercase tracking-wider">
                  Details <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <CheckSquare className="w-8 h-8 opacity-20" />
             </div>
             <div className="text-center">
                <p className="font-bold text-slate-600 dark:text-slate-400">No Punch Items Found</p>
                <p className="text-xs max-w-xs mx-auto">Upload a site photo to automatically generate a punch item using AI.</p>
             </div>
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col md:flex-row">
            
            <div className="w-full md:w-1/2 bg-slate-100 dark:bg-slate-800 relative group">
              {selectedItem.imageUrl ? (
                <img src={selectedItem.imageUrl} alt={selectedItem.description} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon className="w-16 h-16" />
                </div>
              )}
              {selectedItem.coordinates && (
                 <div 
                   className="absolute w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white animate-bounce"
                   style={{ 
                     left: `${selectedItem.coordinates.x}%`, 
                     top: `${selectedItem.coordinates.y}%`,
                     transform: 'translate(-50%, -50%)'
                   }}
                 >
                   <MapPin className="w-4 h-4" />
                 </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/20">
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest mb-1">Conceptual Plan Location</p>
                <p className="text-xs text-white font-medium">{selectedItem.location}</p>
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest",
                  selectedItem.status === 'Open' ? "bg-orange-100 text-orange-700" :
                  selectedItem.status === 'Pending' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                )}>
                  {selectedItem.status}
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight mb-6 uppercase tracking-tight">{selectedItem.description}</h3>
              
              <div className="space-y-6 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CSI Division</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedItem.csiDivision}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsible Party</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedItem.responsibleSub}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Update Item Status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Open', 'Pending', 'Closed'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(selectedItem, s)}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                          selectedItem.status === s 
                           ? "bg-slate-900 text-white border-slate-900 shadow-md transform -translate-y-0.5" 
                           : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        )}
                      >
                        {s === 'Closed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3">
                  <Sparkles className="w-5 h-5 text-orange-500 shrink-0" />
                  <p className="text-[11px] text-orange-800 leading-relaxed font-medium">
                    <strong>AI Analysis:</strong> This item was automatically categorized based on visual data. Subcontractors have been notified of their assigned deficiencies.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Clock className="w-4 h-4" />
                  Last update: {new Date().toLocaleDateString()}
                </div>
                <button className="flex items-center gap-2 text-sm font-black text-orange-600 hover:underline">
                  Project View <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
