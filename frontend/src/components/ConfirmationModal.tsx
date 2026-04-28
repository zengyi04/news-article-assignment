import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirm',
  isDestructive = false
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md glass rounded-[32px] p-8 shadow-2xl overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 opacity-40 hover:opacity-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                isDestructive ? "bg-red-500/10 text-red-500" : "bg-[#DAFB37]/10 text-black dark:text-[#DAFB37]"
              )}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black tracking-tighter uppercase">{title}</h3>
            </div>

            <p className="text-sm font-medium opacity-60 leading-relaxed mb-8">
              {message}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]",
                  isDestructive 
                    ? "bg-red-500 text-white shadow-red-500/20" 
                    : "bg-[#1A1A1A] text-[#DAFB37] shadow-black/20"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
