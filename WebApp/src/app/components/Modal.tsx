import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  autoCloseMs?: number;
}

export default function Modal({
  isOpen,
  title,
  message,
  type = "info",
  onClose,
  autoCloseMs = 10000,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen || autoCloseMs <= 0) return;

    const timer = window.setTimeout(() => {
      onClose();
    }, autoCloseMs);

    return () => window.clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

  const bgColor = {
    success: "bg-white",
    error: "bg-white",
    info: "bg-white",
  }[type];

  const borderColor = {
    success: "border-green-200",
    error: "border-red-200",
    info: "border-blue-200",
  }[type];

  const titleColor = {
    success: "text-[#113F67-900]",
    error: "text-red-900",
    info: "text-[#113F67]",
  }[type];

  const messageColor = {
    success: "text-[#113F67-800]",
    error: "text-red-800",
    info: "text-gray-700",
  }[type];

  const buttonColor = {
    success: "bg-green-600 hover:bg-green-700",
    error: "bg-red-600 hover:bg-red-700",
    info: "bg-[#113F67] hover:bg-[#0d2f4d]",
  }[type];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-gray-900/50 z-40 transition-opacity"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`${bgColor} border ${borderColor} rounded-lg shadow-lg max-w-md w-full`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className={`text-lg font-semibold ${titleColor}`}>{title}</h2>
            <button
              onClick={onClose}
              className="cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className={`text-sm ${messageColor}`}>{message}</p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className={`${buttonColor} cursor-pointer text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
