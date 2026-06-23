import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, User, Calendar, ArrowRight } from 'lucide-react';
import Navigation from '../components/Navigation';
import { API_BASE_URL } from '../apiConfig';

interface BlogArticle {
  _id: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  publishDate?: string;
  created_at?: string;
  author: string;
  content: string;
  image: string;
}

const BlogCard = ({ post, onClick, index }: { post: BlogArticle; onClick: () => void; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.15, duration: 0.5 }}
    onClick={onClick}
    className="group bg-white/50 backdrop-blur-sm rounded-[2rem] p-6 sm:p-8 border border-gray-100 hover:border-[#6C3BFF]/30 hover:shadow-[0_20px_50px_rgba(108,59,255,0.1)] transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-[#6C3BFF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div>
      <span className="inline-block px-3 py-1 rounded-full bg-[#6C3BFF]/10 text-[#6C3BFF] text-[9px] font-black uppercase tracking-widest mb-4 border border-[#6C3BFF]/20">{post.category}</span>
      <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight mb-3 group-hover:text-[#6C3BFF] transition-colors">{post.title}</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6 line-clamp-2">{post.excerpt}</p>
    </div>
    <div className="flex items-center justify-between border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2 text-[#94A3B8] text-[10px] font-bold uppercase tracking-widest">
        <Clock size={14} className="text-[#6C3BFF]" />{post.readTime || '5 min read'}
      </div>
      <div className="flex items-center gap-2 text-[#6C3BFF] font-bold text-sm tracking-tight group-hover:gap-4 transition-all">
        Read More <ArrowRight size={16} />
      </div>
    </div>
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.3 }} />
  </motion.div>
);

const BlogDetail = ({ post, onBack }: { post: BlogArticle; onBack: () => void }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const publishDate = post.publishDate || (post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 pt-40 pb-20">
        <button onClick={onBack} className="flex items-center gap-2 text-[#94A3B8] hover:text-[#6C3BFF] font-bold uppercase tracking-widest text-[10px] mb-12 transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Standard
        </button>
        <span className="inline-block px-4 py-1.5 rounded-full bg-[#6C3BFF]/10 text-[#6C3BFF] text-[10px] font-black uppercase tracking-widest mb-8">{post.category}</span>
        <h1 className="text-4xl sm:text-6xl font-black text-[#0F172A] leading-[1.1] tracking-tight mb-8">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-8 py-8 border-y border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6C3BFF]/10 flex items-center justify-center text-[#6C3BFF]"><User size={18} /></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Author</span>
              <span className="text-sm font-bold text-[#0F172A]">{post.author}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Calendar size={18} /></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Published</span>
              <span className="text-sm font-bold text-[#0F172A]">{publishDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Clock size={18} /></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</span>
              <span className="text-sm font-bold text-[#0F172A]">{post.readTime || '5 min'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-6 mb-20">
        <div className="aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl relative">
          <img src={post.image || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800'} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/20 to-transparent" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-40">
        <div className="text-slate-600 font-medium leading-[1.8] space-y-8 prose prose-slate prose-lg max-w-none">
          {post.content.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-black text-[#0F172A] mt-12 mb-4">{line.slice(3)}</h2>;
            if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-[#0F172A] mt-8 mb-3">{line.slice(4)}</h3>;
            if (line.startsWith('- ')) return <li key={i} className="text-slate-600 ml-6 list-disc">{line.slice(2)}</li>;
            if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.')) return <li key={i} className="text-slate-600 ml-6 list-decimal">{line.slice(3)}</li>;
            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-[#6C3BFF]">{line.slice(2, -2)}</p>;
            if (line.trim() === '') return null;
            return <p key={i} className="text-slate-600">{line}</p>;
          })}
        </div>
      </div>
    </motion.div>
  );
};

const Blog: React.FC = () => {
  const [allPosts, setAllPosts] = useState<BlogArticle[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/blogs`);
        if (res.ok) setAllPosts(await res.json());
      } catch {}
      setLoading(false);
    };
    fetchBlogs();
  }, []);

  useEffect(() => {
    document.title = selectedPost ? `${selectedPost.title} | Studlyf Blog` : "Studlyf | Engineering Standard Explained";
  }, [selectedPost]);

  return (
    <div className="relative bg-slate-50/50 min-h-screen font-sans selection:bg-[#6C3BFF]/20 selection:text-[#6C3BFF]">
      <Navigation />
      <AnimatePresence mode="wait">
        {!selectedPost ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 pb-20 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mb-12">
                <div className="flex flex-col items-start gap-4 mb-4">
                  <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    className="inline-block px-3 py-1 rounded-full bg-[#6C3BFF]/10 text-[#6C3BFF] text-[10px] font-bold uppercase tracking-widest border border-[#6C3BFF]/20"
                  >Studlyf Library</motion.span>
                  <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#0F172A] leading-tight tracking-tight uppercase"
                  >
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] inline-block">BLOGS</span>
                  </motion.h1>
                </div>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed max-w-2xl"
                >Insights on engineering authority, AI-era careers, and skill verification.</motion.p>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#6C3BFF] rounded-full animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                  {allPosts.map((post, index) => (
                    <BlogCard key={post._id} post={post} index={index} onClick={() => setSelectedPost(post)} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <BlogDetail key="detail" post={selectedPost} onBack={() => setSelectedPost(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Blog;

