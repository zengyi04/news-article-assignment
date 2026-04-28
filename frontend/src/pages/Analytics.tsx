import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Article } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, Newspaper, Calendar, ArrowLeft, 
  Download, Filter, ChevronRight, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';

export function Analytics() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Article));
        setArticles(docs);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'articles');
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  // Stats Calculations
  const totalArticles = articles.length;
  const pinnedArticles = articles.filter(a => a.isPinned).length;
  const uniquePublishers = new Set(articles.map(a => a.publisher)).size;

  // Articles per month (Last 6 months)
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const articlesByMonth = last6Months.map(month => {
    const count = articles.filter(a => isSameMonth(new Date(a.date), month)).length;
    return {
      name: format(month, 'MMM'),
      count
    };
  });

  // Articles by Publisher (Top 5)
  const publisherCounts = articles.reduce((acc: any, curr) => {
    acc[curr.publisher] = (acc[curr.publisher] || 0) + 1;
    return acc;
  }, {});

  const publisherData = Object.keys(publisherCounts)
    .map(name => ({ name, value: publisherCounts[name] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Articles by Content Type
  const typeCounts = articles.reduce((acc: any, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {});

  const typeData = [
    { name: 'Standard', value: typeCounts['standard'] || 0, color: '#DAFB37' },
    { name: 'Website', value: typeCounts['website'] || 0, color: '#6366f1' },
    { name: 'PDF', value: typeCounts['pdf'] || 0, color: '#f43f5e' },
    { name: 'Document', value: typeCounts['doc'] || 0, color: '#10b981' },
  ];

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(articles, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `archive_export_${format(new Date(), 'yyyy_MM_dd')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-inherit">
        <Activity className="w-10 h-10 animate-pulse mb-4 opacity-50" />
        <p className="font-bold text-xs uppercase tracking-widest opacity-50">Aggregating Intelligence...</p>
      </div>
    );
  }

  return (
    <div id="analytics-page" className="space-y-12 pb-20">
       <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-bold opacity-50 hover:opacity-100 transition-opacity mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO ARCHIVE
          </button>
          <h2 className="text-5xl font-black tracking-tighter text-inherit mb-3 uppercase">Insights Dashboard</h2>
          <p className="text-sm font-medium opacity-50 italic">Digital footprint analysis and archive metrics.</p>
        </div>
        
        <button
          onClick={exportData}
          className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#1A1A1A] text-[#DAFB37] font-black text-xs uppercase tracking-widest hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-black/20 transition-all duration-300"
        >
          <Download className="w-4 h-4" />
          Export Database
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Archives', value: totalArticles, icon: Newspaper, color: 'text-blue-500' },
          { label: 'High Priority', value: pinnedArticles, icon: TrendingUp, color: 'text-[#DAFB37]' },
          { label: 'Sources', value: uniquePublishers, icon: Users, color: 'text-pink-500' },
          { label: 'Avg Type', value: articles[0]?.type.toUpperCase() || 'N/A', icon: Filter, color: 'text-indigo-500' },
        ].map((kpi, i) => (
          <div key={i} className="glass p-8 rounded-[32px] border-white/10 group hover:bg-white/5 transition-all">
            <kpi.icon className={`w-8 h-8 ${kpi.color} mb-6`} />
            <div className="text-4xl font-black tracking-tighter mb-1">{kpi.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-40">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* Growth Chart */}
        <div className="glass p-8 rounded-[40px] border-white/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black tracking-tighter uppercase">Filing Velocity</h3>
            <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Articles/Month</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={articlesByMonth}>
                <XAxis dataKey="name" stroke="#ffffff30" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff30" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '16px', color: '#fff' }}
                  itemStyle={{ color: '#DAFB37' }}
                />
                <Area type="monotone" dataKey="count" stroke="#DAFB37" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Content Types Pie */}
        <div className="glass p-8 rounded-[40px] border-white/10 lg:col-span-1">
          <h3 className="text-xl font-black tracking-tighter uppercase mb-8">Media Types</h3>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '16px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold uppercase opacity-30">Total</span>
              <span className="text-2xl font-black">{totalArticles}</span>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {typeData.map(type => (
              <div key={type.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                  <span className="text-xs font-bold opacity-60 uppercase">{type.name}</span>
                </div>
                <span className="text-xs font-black">{type.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="glass p-8 rounded-[40px] border-white/10 lg:col-span-2">
          <h3 className="text-xl font-black tracking-tighter uppercase mb-8">Recent Filing Log</h3>
          <div className="space-y-6">
            {articles.slice(0, 5).map((article, i) => (
              <div key={i} className="flex items-center gap-6 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#DAFB37] transition-colors">
                  <Calendar className="w-5 h-5 text-inherit group-hover:text-black transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black tracking-tight truncate group-hover:text-[#DAFB37] transition-colors">{article.title}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{format(new Date(article.date), 'MMM dd, yyyy')}</span>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{article.publisher}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
