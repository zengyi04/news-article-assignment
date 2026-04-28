import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Download } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  type: string;
}

export function PreviewModal({ isOpen, onClose, url, title, type }: PreviewModalProps) {
  const isPdf = type === 'pdf' || url.includes('application/pdf') || url.endsWith('.pdf');
  const isImage = type === 'image' || url.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full h-full max-w-6xl glass rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[#DAFB37] uppercase tracking-[0.2em]">{type} PREVIEW</span>
                <h3 className="text-lg font-bold text-white truncate max-w-md">{title}</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl glass hover:bg-[#DAFB37] hover:text-black transition-all"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button 
                  onClick={onClose}
                  className="p-3 rounded-xl glass hover:bg-red-500 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white dark:bg-[#121212] relative overflow-hidden flex flex-col">
              {isPdf ? (
                <div className="flex-1 w-full h-full bg-[#f0f0f0] dark:bg-[#1a1a1a] flex flex-col">
                  {url.startsWith('data:') ? (
                    <object
                      data={url}
                      type="application/pdf"
                      className="w-full h-full"
                    >
                      <div className="p-10 text-center">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Cannot display PDF directly.</p>
                        <a href={url} download className="text-[#15786B] font-bold underline">Download PDF</a>
                      </div>
                    </object>
                  ) : (
                    <iframe
                      src={url.includes('google.com/viewer') ? url : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                      className="w-full h-full border-none"
                      title="PDF Preview"
                    />
                  )}
                </div>
              ) : isImage ? (
                <div className="w-full h-full flex items-center justify-center p-8 bg-white dark:bg-[#121212]">
                  <img 
                    src={url} 
                    alt={title} 
                    className="max-w-full max-h-full object-contain shadow-sm rounded-lg" 
                  />
                </div>
              ) : (
                <div className="flex-1 relative bg-white dark:bg-black">
                  <iframe
                    src={url}
                    className="w-full h-full border-none bg-white dark:bg-black"
                    title="Web Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                  {/* Overlay message for sites that block iframes */}
                  <div className="absolute bottom-4 right-4 z-10">
                    <a 
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-black dark:bg-[#DAFB37] text-white dark:text-black text-[10px] font-bold rounded-lg shadow-xl hover:opacity-90 transition-all flex items-center gap-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      OPEN IN FULL PAGE
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-black/20 text-center">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Press ESC to close preview • Archive System Secure View
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
