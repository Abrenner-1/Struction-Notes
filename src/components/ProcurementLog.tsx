import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Download, Trash2, Filter, 
  MessageSquare, ArchiveRestore, MoreVertical, X, 
  CheckCircle2, Box, Send, AlertCircle, ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, type Timestamp } from 'firebase/firestore';

import { cn } from '../lib/utils';
import { db, handleFirestoreError } from '../lib/firebase';
import { type ProcurementItem, type ProcurementStatus, type ProcurementComment } from '../types';

export default function ProcurementLog({ projectId, user, highlightedItemId }: { projectId: string, user: any, highlightedItemId?: string | null }) {
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemRefs = React.useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (highlightedItemId && itemRefs.current[highlightedItemId]) {
      itemRefs.current[highlightedItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedItemId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProcurementStatus | 'All'>('All');
  const [view, setView] = useState<'Active' | 'Deleted'>('Active');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProcurementItem | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProcurementItem | null>(null);
  const [commentsItem, setCommentsItem] = useState<ProcurementItem | null>(null);

  // Load from Firestore
  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_procurement_${projectId}`);
      if (data) {
        try {
          setItems(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest procurement data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const path = `projects/${projectId}/procurement`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProcurementItem)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'get', path);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  // Derived State
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const isDeleted = item.deletedAt !== null;
      if (view === 'Active' && isDeleted) return false;
      if (view === 'Deleted' && !isDeleted) return false;

      if (statusFilter !== 'All' && item.status !== statusFilter) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.tag.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.vendor.toLowerCase().includes(query) ||
          item.submittalRef.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [items, view, statusFilter, searchQuery]);

  const sortedItems = useMemo(() => {
    const itemsToSort = [...filteredItems];
    if (sortConfig.key !== null) {
      itemsToSort.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (aVal === bVal) return 0;
        
        // Handle dates separately if needed, though ISO strings and string dates sort correctly alphabetically
        if (sortConfig.key === 'expectedDate') {
          const dateA = aVal ? new Date(aVal as string).getTime() : 0;
          const dateB = bVal ? new Date(bVal as string).getTime() : 0;
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return itemsToSort;
  }, [filteredItems, sortConfig]);

  const handleSort = (key: keyof ProcurementItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSave = async (item: Partial<ProcurementItem>) => {
    if (!user) return;

    if (user.uid === 'guest-123') {
      let updatedItems;
      if (editingItem) {
        updatedItems = items.map(i => i.id === editingItem.id ? { ...i, ...item } as ProcurementItem : i);
      } else {
        const newItem: ProcurementItem = {
          ...item,
          id: crypto.randomUUID(),
          projectId,
          ownerId: user.uid,
          comments: [],
          deletedAt: null,
          createdAt: { toMillis: () => Date.now() } as any
        } as ProcurementItem;
        updatedItems = [newItem, ...items];
      }
      setItems(updatedItems);
      localStorage.setItem(`guest_procurement_${projectId}`, JSON.stringify(updatedItems));
      setIsModalOpen(false);
      setEditingItem(null);
      return;
    }

    const path = `projects/${projectId}/procurement`;

    try {
      if (editingItem) {
        await updateDoc(doc(db, path, editingItem.id), {
          ...item,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, path), {
          ...item,
          projectId,
          ownerId: user.uid,
          comments: [],
          deletedAt: null,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      handleFirestoreError(err, 'write', path);
    }
  };

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sortedItems.length && sortedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map(i => i.id)));
    }
  };

  const handleBulkStatus = async (status: ProcurementStatus) => {
    const path = `projects/${projectId}/procurement`;
    const batch = writeBatch(db);
    
    selectedIds.forEach(id => {
      batch.update(doc(db, path, id), { status });
    });

    try {
      await batch.commit();
      setSelectedIds(new Set());
    } catch (err) {
      handleFirestoreError(err, 'write', path);
    }
  };

  const handleDeleteSelected = async () => {
    const path = `projects/${projectId}/procurement`;
    const batch = writeBatch(db);

    try {
      if (view === 'Active') {
        // Soft Delete
        selectedIds.forEach(id => {
          batch.update(doc(db, path, id), { deletedAt: new Date().toISOString() });
        });
      } else {
        // Hard Delete
        selectedIds.forEach(id => {
          batch.delete(doc(db, path, id));
        });
      }
      await batch.commit();
      setSelectedIds(new Set());
    } catch (err) {
      handleFirestoreError(err, 'write', path);
    }
  };

  const handleRestoreSelected = async () => {
    const path = `projects/${projectId}/procurement`;
    const batch = writeBatch(db);
    
    selectedIds.forEach(id => {
      batch.update(doc(db, path, id), { deletedAt: null });
    });

    try {
      await batch.commit();
      setSelectedIds(new Set());
    } catch (err) {
      handleFirestoreError(err, 'write', path);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Procurement Log - ${format(new Date(), 'MMM dd, yyyy')}`, 14, 15);
    
    const tableData = sortedItems.map(item => [
      item.tag,
      item.description,
      item.division,
      item.vendor,
      item.status,
      item.leadTime,
      item.expectedDate ? format(new Date(item.expectedDate), 'MM/dd/yy') : ''
    ]);

    autoTable(doc, {
      head: [['Tag', 'Description', 'Division', 'Vendor', 'Status', 'Lead Time', 'Expected']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] } // Orange 500
    });

    doc.save('procurement-log.pdf');
  };

  const statusColors = {
    'Not Ordered': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    'Ordered': 'bg-blue-50 text-blue-600 border-blue-200',
    'In Transit': 'bg-amber-50 text-amber-600 border-amber-200',
    'On Site': 'bg-emerald-50 text-emerald-600 border-emerald-200'
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Tag, Vendor, Desc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 flex items-center px-3 flex-1 sm:flex-none h-10">
              <Filter className="w-4 h-4 text-slate-400 mr-2" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="py-2 text-sm outline-none bg-transparent font-medium text-slate-700 dark:text-slate-300 cursor-pointer w-full"
              >
                <option value="All">All Statuses</option>
                <option value="Not Ordered">Not Ordered</option>
                <option value="Ordered">Ordered</option>
                <option value="In Transit">In Transit</option>
                <option value="On Site">On Site</option>
              </select>
            </div>
            <select 
              value={view}
              onChange={(e) => {
                setView(e.target.value as any);
                setSelectedIds(new Set());
              }}
              className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 px-3 h-10 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:border-slate-300 transition-colors flex-1 sm:flex-none"
            >
              <option value="Active">Active Log</option>
              <option value="Deleted">Recycle Bin</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <button 
            onClick={exportPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:border-orange-500 hover:text-orange-500 transition-all font-semibold text-sm bg-white dark:bg-slate-900"
          >
            <Download className="w-4 h-4" />
            PDF Backup
          </button>
          {view === 'Active' && (
            <button 
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-bold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Material
            </button>
          )}
        </div>
      </div>

      {/* Bulk Edit Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-8 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-40 flex flex-col md:flex-row items-center justify-between p-3 bg-slate-900 text-white rounded-xl shadow-2xl shadow-slate-900/40 border border-slate-700 md:min-w-[400px] gap-3"
          >
            <span className="text-sm font-semibold pl-2">{selectedIds.size} items selected</span>
            <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
              {view === 'Active' ? (
                <>
                  <select 
                    onChange={(e) => {
                      if(e.target.value) handleBulkStatus(e.target.value as ProcurementStatus);
                    }}
                    className="bg-slate-800 text-sm px-3 py-1.5 rounded outline-none border border-slate-700 cursor-pointer text-white flex-1 md:flex-none"
                  >
                    <option value="">Update Status...</option>
                    <option value="Not Ordered">Not Ordered</option>
                    <option value="Ordered">Ordered</option>
                    <option value="In Transit">In Transit</option>
                    <option value="On Site">On Site</option>
                  </select>
                  <button 
                    onClick={handleDeleteSelected}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-all text-sm font-semibold flex-1 md:flex-none"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleRestoreSelected}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/30 transition-all text-sm font-semibold flex-1 md:flex-none"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Restore
                  </button>
                  <button 
                    onClick={handleDeleteSelected}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-all text-sm font-semibold flex-1 md:flex-none"
                  >
                    <Trash2 className="w-4 h-4" />
                    Permadelete
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Table Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse table-auto border-spacing-0 min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
              <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
                <th className="p-4 w-12 text-center border-r border-slate-200 dark:border-slate-700">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === sortedItems.length && sortedItems.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                  />
                </th>
                <th className="p-0 border-r border-slate-200 dark:border-slate-700 align-top">
                  <div className="resize-x overflow-hidden group/header" style={{ width: '250px', minWidth: '150px' }}>
                    <div className="p-4 w-full h-full cursor-pointer hover:bg-slate-100 dark:bg-slate-800 transition-colors" onClick={() => handleSort('tag')}>
                      <div className="flex items-center gap-1">Item / Tag {sortConfig.key === 'tag' && <ArrowUpDown className="w-3 h-3 text-orange-500" />}</div>
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-slate-200 dark:border-slate-700 align-top">
                  <div className="resize-x overflow-hidden min-w-[120px]" style={{ width: '150px' }}>
                    <div className="p-4 w-full h-full cursor-pointer hover:bg-slate-100 dark:bg-slate-800 transition-colors" onClick={() => handleSort('division')}>
                      <div className="flex items-center gap-1">Division {sortConfig.key === 'division' && <ArrowUpDown className="w-3 h-3 text-orange-500" />}</div>
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-slate-200 dark:border-slate-700 align-top">
                  <div className="resize-x overflow-hidden min-w-[120px]" style={{ width: '150px' }}>
                    <div className="p-4 w-full h-full cursor-pointer hover:bg-slate-100 dark:bg-slate-800 transition-colors" onClick={() => handleSort('vendor')}>
                      <div className="flex items-center gap-1">Vendor {sortConfig.key === 'vendor' && <ArrowUpDown className="w-3 h-3 text-orange-500" />}</div>
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-slate-200 dark:border-slate-700 align-top">
                  <div className="resize-x overflow-hidden min-w-[150px]" style={{ width: '180px' }}>
                    <div className="p-4 w-full h-full cursor-pointer hover:bg-slate-100 dark:bg-slate-800 transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">Status {sortConfig.key === 'status' && <ArrowUpDown className="w-3 h-3 text-orange-500" />}</div>
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-slate-200 dark:border-slate-700 align-top">
                  <div className="resize-x overflow-hidden min-w-[120px]" style={{ width: '150px' }}>
                    <div className="p-4 w-full h-full cursor-pointer hover:bg-slate-100 dark:bg-slate-800 transition-colors" onClick={() => handleSort('leadTime')}>
                      <div className="flex items-center gap-1">Lead Time {sortConfig.key === 'leadTime' && <ArrowUpDown className="w-3 h-3 text-orange-500" />}</div>
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-slate-200 dark:border-slate-700 align-top">
                  <div className="resize-x overflow-hidden min-w-[120px]" style={{ width: '150px' }}>
                    <div className="p-4 w-full h-full cursor-pointer hover:bg-slate-100 dark:bg-slate-800 transition-colors" onClick={() => handleSort('expectedDate')}>
                      <div className="flex items-center gap-1">Expected {sortConfig.key === 'expectedDate' && <ArrowUpDown className="w-3 h-3 text-orange-500" />}</div>
                    </div>
                  </div>
                </th>
                <th className="p-4 w-16 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.length > 0 ? (
                sortedItems.map(item => (
                  <tr 
                    key={`proc-row-${item.id}`} 
                    ref={el => itemRefs.current[item.id] = el}
                    className={cn(
                      "border-b transition-colors group",
                      highlightedItemId === item.id ? "bg-orange-50/50 border-orange-200 ring-1 ring-inset ring-orange-200" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50/50"
                    )}
                  >
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleSelect(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight cursor-pointer hover:text-orange-600" onClick={() => { if(view === 'Active') { setEditingItem(item); setIsModalOpen(true); }}}>
                        {item.tag}
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[250px] break-words [overflow-wrap:anywhere]">{item.description}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{item.division}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.vendor}</td>
                    <td className="p-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border",
                        statusColors[item.status]
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.leadTime}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      {item.expectedDate ? format(new Date(item.expectedDate), 'MMM dd, yyyy') : '--'}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setCommentsItem(item)}
                        className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg relative transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {item.comments?.length > 0 && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full border border-white" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-24 text-center">
                    <Box className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Items Found</h3>
                    <p className="text-slate-400 mb-6 text-sm">
                      {searchQuery || statusFilter !== 'All' 
                        ? "Try adjusting your filters or search." 
                        : (view === 'Active' ? "Start tracking materials by adding your first procurement item." : "Recycle bin is empty.")}
                    </p>
                    {view === 'Active' && !searchQuery && statusFilter === 'All' && (
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-bold text-sm shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add First Item
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ProcurementModal 
            initialData={editingItem}
            onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
            onSave={handleSave}
          />
        )}
        {commentsItem && (
          <CommentsPanel 
            item={commentsItem}
            user={user}
            onClose={() => setCommentsItem(null)}
            onAddComment={async (text) => {
              const newComment = {
                id: crypto.randomUUID(),
                text,
                author: user?.displayName || user?.email || 'Project Manager',
                timestamp: new Date().toISOString()
              };
              const path = `projects/${projectId}/procurement`;
              try {
                const itemDoc = items.find(i => i.id === commentsItem.id);
                if (!itemDoc) return;
                
                const updatedComments = [...(itemDoc.comments || []), newComment];
                await updateDoc(doc(db, path, commentsItem.id), {
                  comments: updatedComments
                });
                
                setCommentsItem({ ...itemDoc, comments: updatedComments });
              } catch (err) {
                handleFirestoreError(err, 'write', path);
              }
            }}
            onDeleteComment={async (commentId: string) => {
              const path = `projects/${projectId}/procurement`;
              try {
                const itemDoc = items.find(i => i.id === commentsItem.id);
                if (!itemDoc) return;

                const updatedComments = (itemDoc.comments || []).filter(c => c.id !== commentId);
                await updateDoc(doc(db, path, commentsItem.id), {
                  comments: updatedComments
                });

                setCommentsItem({ ...itemDoc, comments: updatedComments });
              } catch (err) {
                handleFirestoreError(err, 'write', path);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProcurementModal({ initialData, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    tag: initialData?.tag || '',
    description: initialData?.description || '',
    status: initialData?.status || 'Not Ordered',
    vendor: initialData?.vendor || '',
    leadTime: initialData?.leadTime || '',
    expectedDate: initialData?.expectedDate || '',
    submittalRef: initialData?.submittalRef || '',
    division: initialData?.division || ''
  });

  const handleChange = (e: any) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Procurement Log</h2>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">{initialData ? 'Edit Item' : 'Add Item'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <form 
          className="p-6 overflow-y-auto space-y-4"
          onSubmit={(e) => { e.preventDefault(); onSave(formData); }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Item / Tag*</label>
              <input required name="tag" value={formData.tag} onChange={handleChange} placeholder="e.g. AHU-1" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm font-semibold text-slate-800 dark:text-slate-200" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Division</label>
              <input name="division" value={formData.division} onChange={handleChange} placeholder="e.g. Div 23 - HVAC" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm font-semibold text-slate-800 dark:text-slate-200" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
              <input name="description" value={formData.description} onChange={handleChange} placeholder="Air Handling Unit 15,000 CFM" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm font-semibold text-slate-800 dark:text-slate-200" />
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <option value="Not Ordered">Not Ordered</option>
                <option value="Ordered">Ordered</option>
                <option value="In Transit">In Transit</option>
                <option value="On Site">On Site</option>
              </select>
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Vendor / Manufacturer</label>
              <input name="vendor" value={formData.vendor} onChange={handleChange} placeholder="Trane" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm font-semibold text-slate-800 dark:text-slate-200" />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lead Time</label>
              <input name="leadTime" value={formData.leadTime} onChange={handleChange} placeholder="8-12 Weeks" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm font-semibold text-slate-800 dark:text-slate-200" />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Expected On Site</label>
              <input name="expectedDate" type="date" value={formData.expectedDate} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm font-semibold text-slate-800 dark:text-slate-200" />
            </div>
          </div>

          <div className="pt-6 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 transition-all">Cancel</button>
            <button type="submit" className="flex-1 py-3 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-600 transition-all shadow-md">Save Item</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function CommentsPanel({ item, user, onClose, onAddComment, onDeleteComment }: any) {
  const [text, setText] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-sm bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-700"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">{item.tag} Comments</h3>
            <p className="text-xs text-slate-500 mt-1">{item.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          {item.comments?.length > 0 ? (
            item.comments.map((comment: any) => (
              <div key={comment.id} className="relative pl-6 border-l-2 border-orange-200">
                <div className="absolute -left-[5px] top-1 w-2 h-2 bg-orange-500 rounded-full" />
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      {comment.author === 'Project Manager' && user?.displayName ? user.displayName : comment.author}
                    </span>
                    <span className="text-[10px] text-slate-400">{format(new Date(comment.timestamp), 'MMM dd, h:mm a')}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if(window.confirm('Delete this comment?')) {
                        onDeleteComment(comment.id);
                      }
                    }}
                    className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-colors"
                    title="Delete Comment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-800">{comment.text}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">No comments yet</p>
            </div>
          )}
        </div>

        <form 
          className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          onSubmit={(e) => {
            e.preventDefault();
            if(!text.trim()) return;
            onAddComment(text);
            setText('');
          }}
        >
          <div className="relative">
            <input 
              type="text"
              placeholder="Add update or constraint..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-full pl-5 pr-12 py-3 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
            <button 
              type="submit"
              disabled={!text.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
