import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ type, message, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-gradient-to-r from-green-500 to-emerald-500',
      borderColor: 'border-green-400',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-gradient-to-r from-red-500 to-rose-500',
      borderColor: 'border-red-400',
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-gradient-to-r from-orange-500 to-amber-500',
      borderColor: 'border-orange-400',
    },
    info: {
      icon: Info,
      bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      borderColor: 'border-blue-400',
    },
  };

  const { icon: Icon, bgColor, borderColor } = config[type];

  return (
    <div className="fixed top-6 right-6 z-50 animate-[slideInRight_0.3s_ease-out]">
      <div className={`${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] border ${borderColor} flex items-center gap-3 min-w-[320px] max-w-md backdrop-blur-sm`}>
        <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
        <p className="font-medium text-[15px] flex-1 leading-snug">{message}</p>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
