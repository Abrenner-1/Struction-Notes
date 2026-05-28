import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Clock, Edit3, FileText, PanelLeftClose, PanelLeftOpen, Plus, Save, Search, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { ProjectPage } from '../types';
import { cn } from '../lib/utils';
import ReactQuill from 'react-quill-new';

const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ]
};

export function ProjectCanvas({ projectId, user }: { projectId: string, user: any }) {
  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<ProjectPage | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const modules = useMemo(() => QUILL_MODULES, []);

  // Sync state with screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'projects', projectId, 'pages')
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetchedPages = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectPage));
      fetchedPages.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setPages(fetchedPages);
      if (fetchedPages.length > 0 && !selectedPage) {
        setSelectedPage(fetchedPages[0]);
        setContent(fetchedPages[0].content);
        setTitle(fetchedPages[0].title);
      }
    }, (error) => {
      handleFirestoreError(error, 'list', `projects/${projectId}/pages`);
    });

    return () => unsub();
  }, [projectId, user]);

  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePage = async () => {
    try {
      await addDoc(collection(db, 'projects', projectId, 'pages'), {
        projectId,
        title: 'Untitled Page',
        content: '',
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, 'create', `projects/${projectId}/pages`);
    }
  };

  const savePage = async (newTitle?: string, newContent?: string) => {
    if (!selectedPage) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId, 'pages', selectedPage.id), {
        title: newTitle ?? title,
        content: newContent ?? content,
        updatedAt: serverTimestamp()
      });
      setSelectedPage({ ...selectedPage, title: newTitle ?? title, content: newContent ?? content });
      setLastSaved(new Date());
    } catch (err) {
      handleFirestoreError(err, 'update', `projects/${projectId}/pages/${selectedPage.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (!selectedPage) return;
    
    // Check if anything actually changed
    const hasChanges = (title !== selectedPage.title) || (content !== selectedPage.content);
    if (!hasChanges) return;

    const timeoutId = setTimeout(() => {
      savePage();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [content, title, selectedPage?.id]);

  const deletePage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'pages', id));
      if (selectedPage?.id === id) {
        setSelectedPage(null);
        setContent('');
        setTitle('');
      }
    } catch (err) {
      handleFirestoreError(err, 'delete', `projects/${projectId}/pages/${id}`);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm flex h-[600px] relative">
      {/* Pages Sidebar */}
      <motion.div 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 0 : 256, opacity: isSidebarCollapsed ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          "border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex flex-col shrink-0 overflow-hidden",
          isSidebarCollapsed ? "w-0" : "w-64"
        )}
      >
        <div className="p-4 space-y-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Documentation Pages</h3>
            <button 
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 hover:bg-slate-100 dark:bg-slate-800 rounded text-slate-400 lg:hidden"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-xs transition-all"
            />
          </div>
          <button 
            onClick={handleCreatePage}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            New Note Page
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredPages.map(page => (
            <div 
              key={`page-item-${page.id}`}
              onClick={() => {
                setSelectedPage(page);
                setContent(page.content);
                setTitle(page.title);
              }}
              className={cn(
                "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all whitespace-nowrap",
                selectedPage?.id === page.id 
                  ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm" 
                  : "hover:bg-slate-100 dark:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden text-ellipsis">
                <FileText className={cn("w-3.5 h-3.5 shrink-0", selectedPage?.id === page.id ? "text-orange-500" : "text-slate-400")} />
                <span className={cn("text-xs font-bold truncate", selectedPage?.id === page.id ? "text-slate-900 dark:text-slate-100" : "text-slate-500")}>
                  {page.title}
                </span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deletePage(page.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
              >
                <Trash className="w-3 h-3" />
              </button>
            </div>
          ))}
          {pages.length === 0 && (
            <div className="py-12 text-center whitespace-nowrap">
              <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Note Pages</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative">
        {isSidebarCollapsed && (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute left-4 top-4 z-20 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-slate-400 hover:text-orange-500 transition-all flex items-center gap-2"
          >
            <PanelLeftOpen className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Open Menu</span>
          </motion.button>
        )}
        {selectedPage ? (
          <>
            <div className={cn(
              "p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/30 transition-all",
              isSidebarCollapsed && "pl-16"
            )}>
              <div className="flex-1">
                <input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Page Title"
                  className="bg-transparent border-none outline-none text-xl font-bold text-slate-800 dark:text-slate-200 w-full placeholder:text-slate-300"
                />
                <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {isSaving ? 'Syncing changes...' : lastSaved ? `Saved at ${format(lastSaved, 'HH:mm:ss')}` : (selectedPage.updatedAt ? `Last Edited: ${format(selectedPage.updatedAt.toDate(), 'HH:mm')}` : 'Just now')}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => savePage()}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-widest",
                  isSaving ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : "bg-orange-500 text-white hover:bg-orange-600 shadow-md active:scale-95"
                )}
              >
                <Save className="w-3 h-3" />
                {isSaving ? 'Saving...' : 'Save Now'}
              </button>
            </div>
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
              <ReactQuill 
                theme="snow" 
                value={content} 
                onChange={setContent}
                placeholder="Start drafting your operational notes, site summaries, or long-form documentation..."
                className="flex-1 quill-editor-full"
                modules={modules}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-300">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800 shadow-inner">
              <Edit3 className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-500 mb-2 tracking-tight">Project Notes Selected</h3>
            <p className="max-w-xs text-xs font-medium leading-relaxed uppercase tracking-widest opacity-60">
              Select or create a page from the sidebar to begin freeform documentation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
