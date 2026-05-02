import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Trash2 } from 'lucide-react';

interface ReplaceCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  newStoreName: string;
}

export default function ReplaceCartModal({ isOpen, onClose, onConfirm, newStoreName }: ReplaceCartModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[101] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl pointer-events-auto border border-gray-100 dark:border-gray-800"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} />
              </div>
              
              <h3 className="text-xl font-extrabold text-center text-gray-900 dark:text-white mb-2">
                Replace cart item?
              </h3>
              
              <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                Your cart contains items from a different store. Do you want to discard the selection and start a new order with <span className="font-bold text-gray-700 dark:text-gray-200">{newStoreName}</span>?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  No, cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-lg shadow-red-200 dark:shadow-red-900/20"
                >
                  Replace
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
