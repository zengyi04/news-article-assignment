import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Article } from '../types';
import { Search, RefreshCw, Plus, Loader2, BookOpen, Trash2, Edit3, Calendar, FileText, Globe, ExternalLink, Bookmark, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'react-toastify';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { PreviewModal } from '../components/PreviewModal';

export function Dashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    publisher: 'All',
    dateRange: 'All'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ url: string; title: string; type: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();

  const fetchArticles = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    
    try {
      const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Article));
      setArticles(docs);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Failed to load articles. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    // Optimistic update - remove immediately
    const originalArticles = [...articles];
    setArticles(articles.filter(a => a.id !== deleteId));
    setDeleteId(null);
    toast.success('Article purged from archive');
    
    try {
      await deleteDoc(doc(db, 'articles', deleteId));
    } catch (error) {
      // Rollback on error
      setArticles(originalArticles);
      toast.error('Failed to delete article. Please try again.');
      console.error('Error deleting article:', error);
    }
  };

  const togglePin = async (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    
    // Optimistic update - toggle immediately
    const originalArticles = [...articles];
    const newPinnedState = !article.isPinned;
    setArticles(articles.map(a => a.id === article.id ? { ...a, isPinned: newPinnedState } : a));
    toast.success(newPinnedState ? 'Article pinned to top' : 'Article unpinned');
    
    try {
      const docRef = doc(db, 'articles', article.id);
      await updateDoc(docRef, { isPinned: newPinnedState });
    } catch (error) {
      // Rollback on error
      setArticles(originalArticles);
      toast.error('Failed to update article. Please try again.');
      console.error('Error toggling pin:', error);
    }
  };

  const publishers = useMemo(() => ['All', ...new Set(articles.map(a => a.publisher))], [articles]);

  const filteredArticles = useMemo(() => {
    return articles
      .filter(article => {
        const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            article.publisher.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesPublisher = filters.publisher === 'All' || article.publisher === filters.publisher;
        
        let matchesDate = true;
        if (filters.dateRange !== 'All') {
          const date = new Date(article.date);
          const now = new Date();
          if (filters.dateRange === 'Last 7 Days') {
            const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
            matchesDate = date >= sevenDaysAgo;
          } else if (filters.dateRange === 'Last 30 Days') {
            const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
            matchesDate = date >= thirtyDaysAgo;
          }
        }

        return matchesSearch && matchesPublisher && matchesDate;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
  }, [articles, searchTerm, filters]);

  const totalPages = Math.ceil(filteredArticles.length / PAGE_SIZE);
  const paginatedArticles = useMemo(() => {
    return filteredArticles.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );
  }, [filteredArticles, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const SkeletonCard = () => (
    <div className="rounded-[40px] glass p-8 flex flex-col md:flex-row gap-8 animate-pulse">
      <div className="w-full md:w-48 h-48 rounded-3xl bg-white/20" />
      <div className="flex-1 space-y-4">
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-white/20 rounded-lg" />
          <div className="h-6 w-32 bg-white/20 rounded-lg" />
        </div>
        <div className="h-10 w-3/4 bg-white/20 rounded-xl" />
        <div className="h-20 w-full bg-white/20 rounded-xl" />
      </div>
    </div>
  );

  return (
    <div id="dashboard-page">
      <header className="flex items-end justify-between mb-12">
        <div>
          <h2 className="text-5xl font-black tracking-tighter text-inherit mb-3">THE ARCHIVE</h2>
          <p className="text-sm font-medium opacity-50 italic">Curating truth, one article at a time.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            id="refresh-button"
            onClick={() => fetchArticles(true)}
            className="p-4 glass rounded-2xl hover:bg-[#DAFB37] hover:text-black transition-all duration-300 group"
            title="Refresh database"
          >
            <RefreshCw className={cn("w-5 h-5 group-hover:rotate-180 transition-transform duration-500", refreshing && "animate-spin")} />
          </button>
          <Link
            id="create-article-link"
            to="/editor"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#1A1A1A] text-[#DAFB37] font-black text-xs uppercase tracking-widest hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-black/20 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            New Piece
          </Link>
        </div>
      </header>

      <div className="space-y-4 mb-12">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30 group-focus-within:opacity-100 transition-opacity" />
            <input
              id="search-input"
              type="text"
              placeholder="Filter the collection..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 rounded-3xl glass outline-none focus:ring-4 focus:ring-[#DAFB37]/30 transition-all text-sm font-medium"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-8 py-5 rounded-3xl glass text-xs font-black uppercase tracking-widest transition-all",
              showFilters ? "bg-[#DAFB37] text-black" : "hover:bg-white/10"
            )}
          >
            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="glass p-8 rounded-[32px] grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">By Publisher</label>
                  <select 
                    value={filters.publisher}
                    onChange={(e) => setFilters({ ...filters, publisher: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl glass border-none outline-none text-sm font-bold"
                  >
                    {publishers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">By Date Range</label>
                  <select 
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl glass border-none outline-none text-sm font-bold"
                  >
                    <option value="All">All Time</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-8">
        <h3 className="text-[#15786B] text-xl font-black uppercase tracking-tight">
          {filteredArticles.length.toLocaleString()} ARTICLES FOUND
        </h3>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-8 rounded-lg animate-pulse">
                <div className="h-4 w-48 bg-gray-100 dark:bg-white/5 rounded mb-4" />
                <div className="h-8 w-3/4 bg-gray-100 dark:bg-white/5 rounded mb-6" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded" />
                  <div className="h-4 w-5/6 bg-gray-100 dark:bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedArticles.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {paginatedArticles.map((article, idx) => (
              <motion.div
                key={article.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <div className={cn(
                  "group relative border-t border-gray-100 dark:border-white/5 p-8 md:p-12 transition-all hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
                  article.isPinned && "border-l-4 border-l-[#15786B]"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <span className="text-gray-500 dark:text-gray-400">{article.publisher}</span>
                        <span>{format(new Date(article.date), 'MMMM dd, yyyy').toUpperCase()}</span>
                      </div>
                      {article.sourceUrl && (
                        <button 
                          onClick={() => setPreviewData({ url: article.sourceUrl!, title: article.title, type: article.type })}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-[#15786B] hover:opacity-100 opacity-60 transition-opacity bg-white dark:bg-white/5 px-2 py-1 rounded border border-[#15786B]/10 hover:border-[#15786B]/30"
                        >
                          <Globe className="w-3 h-3" />
                          {article.sourceUrl.startsWith('data:') ? 'ATTACHED DOCUMENT' : (() => {
                            try {
                              return new URL(article.sourceUrl!).hostname;
                            } catch {
                              return 'VIEW SOURCE';
                            }
                          })()}
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={(e) => togglePin(e, article)}
                      className={cn(
                        "transition-all",
                        article.isPinned ? "text-[#15786B]" : "text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400"
                      )}
                    >
                      <Bookmark className={cn("w-5 h-5", article.isPinned && "fill-current")} />
                    </button>
                  </div>

                  <h3 
                    onClick={() => article.sourceUrl ? setPreviewData({ url: article.sourceUrl, title: article.title, type: article.type }) : navigate(`/editor/${article.id}`)}
                    className="text-2xl md:text-3xl font-bold text-[#202124] dark:text-[#F8FAFC] mb-3 hover:text-[#15786B] cursor-pointer transition-colors leading-tight"
                  >
                    {article.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 mb-8 text-[9px] font-bold uppercase tracking-tight">
                    <div className="flex items-center gap-1 text-[#15786B]">
                      <span>1 {article.type.toUpperCase()} MENTIONED</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#15786B] dark:bg-white/5 rounded-full px-2 py-0.5 border border-[#15786B]/10">
                      <div className="w-4 h-4 rounded-full border border-[#15786B] flex items-center justify-center">
                        <RefreshCw className="w-2 h-2" />
                      </div>
                      <span>AUTO-SUMMARISED BY CHRONICLE</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-white/5 pt-6">
                    <div className="flex flex-col md:flex-row gap-8">
                      {article.imageUrl ? (
                        <div className="w-full md:w-40 h-40 shrink-0 rounded-lg overflow-hidden border border-gray-100 dark:border-white/10 mb-4 md:mb-0 dark:bg-[#1a1a1a] p-1">
                          <img 
                            src={article.imageUrl} 
                            alt="" 
                            className="w-full h-full object-cover rounded shadow-sm" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-full md:w-40 h-40 shrink-0 rounded-lg border border-gray-100 dark:border-white/10 mb-4 md:mb-0 dark:bg-[#1a1a1a] flex items-center justify-center p-8 text-[#15786B]/20">
                          {article.type === 'pdf' ? <FileText className="w-12 h-12" /> : <Globe className="w-12 h-12" />}
                        </div>
                      )}
                      <div 
                        className="flex-1 text-[#404040] dark:text-gray-300 text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-none 
                          prose-ul:list-disc prose-li:my-2 prose-p:my-2
                          [&>ul]:ml-4 [&>ul>li]:pl-2"
                        dangerouslySetInnerHTML={{ __html: article.summary }}
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {article.sourceUrl && (
                      <button
                        onClick={() => setPreviewData({ url: article.sourceUrl!, title: article.title, type: article.type })}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-gray-400 hover:text-[#15786B] hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        PREVIEW
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/editor/${article.id}`)}
                      className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-gray-400 hover:text-[#15786B] hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      REFINE
                    </button>
                    <button
                      onClick={() => setDeleteId(article.id)}
                      className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      PURGE
                    </button>
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>

        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border-2 border-dashed border-white/10">
            <BookOpen className="w-12 h-12 text-white/10 mb-4" />
            <h4 className="text-lg font-bold mb-1">No articles found</h4>
            <p className="text-sm opacity-40 max-w-xs mx-auto mb-6">
              {searchTerm || filters.publisher !== 'All' || filters.dateRange !== 'All' 
                ? "We couldn't find anything matching your specific filters." 
                : "Your archive is currently empty. Start by publishing your first piece!"}
            </p>
            {!searchTerm && (
              <Link
                to="/editor"
                className="px-6 py-2 rounded-xl bg-white text-black text-sm font-bold shadow-sm"
              >
                Create New
              </Link>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && !loading && (
        <div className="mt-12 flex items-center gap-2 text-sm font-bold text-[#15786B]">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="w-8 h-8 rounded border border-[#15786B] flex items-center justify-center hover:bg-[#15786B] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {"<"}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button 
                  key={n} 
                  onClick={() => setCurrentPage(n)}
                  className={cn(
                    "w-8 h-8 rounded flex items-center justify-center transition-colors",
                    n === currentPage ? "bg-[#15786B] text-white" : "hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-white/10"
                  )}
                >
              {n}
            </button>
          ))}
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="w-8 h-8 rounded border border-[#15786B] flex items-center justify-center hover:bg-[#15786B] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {">"}
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Purge Article?"
        message="This will permanently delete this piece of history from the archive. This action is irreversible."
      />

      {previewData && (
        <PreviewModal
          isOpen={!!previewData}
          onClose={() => setPreviewData(null)}
          url={previewData.url}
          title={previewData.title}
          type={previewData.type}
        />
      )}
    </div>
  );
}
