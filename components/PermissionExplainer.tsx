import React, { useState } from 'react';

interface PermissionExplainerProps {
  onRequestPermission: () => Promise<void>;
  onSkip: () => void;
}

/**
 * Displays an explanation UI before the browser permission prompt.
 * Shows on Chromium browsers with multiple screens when permission is 'prompt'.
 * Helps teachers understand why the permission is being requested.
 */
const PermissionExplainer: React.FC<PermissionExplainerProps> = ({
  onRequestPermission,
  onSkip
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      await onRequestPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed top-16 right-4 z-50 bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-xl max-w-sm animate-fade-in font-poppins">
      <div className="flex items-start gap-4">
        {/* Monitor Icon */}
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0 text-2xl">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-blue-800 text-sm">
            Auto-Place on Projector
          </h3>

          <p className="text-blue-700 text-xs mt-2 leading-relaxed">
            We can automatically open the student view on your projector instead of your laptop screen.
          </p>

          <p className="text-blue-600 text-xs mt-2 leading-relaxed">
            Your browser will ask permission to "manage windows on all displays" - this just lets us know where your projector is.
          </p>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                isRequesting
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRequesting ? 'Requesting...' : 'Enable Auto-Placement'}
            </button>

            <button
              onClick={onSkip}
              disabled={isRequesting}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
            >
              Skip, I'll drag it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionExplainer;
