"use client";

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function AlertModal({
  isOpen,
  title,
  message,
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">

        <h4 className="text-lg font-semibold text-[#113F67]">
          {title}
        </h4>

        <p className="text-sm text-gray-700 whitespace-pre-line">
          {message}
        </p>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-[#113F67] text-white hover:bg-[#0c2f4d]"
          >
            OK
          </button>
        </div>

      </div>
    </div>
  );
}