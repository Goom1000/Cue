import React, { useState } from 'react';

interface ManualPlacementGuideProps {
  studentUrl: string;
}

/**
 * Displays instructions for manually placing the student window on a projector.
 * Shows on Firefox/Safari (API not supported) or when permission is denied.
 * Includes numbered steps and a copyable URL for direct projector access.
 */
const ManualPlacementGuide: React.FC<ManualPlacementGuideProps> = ({
  studentUrl
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(studentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="fixed top-16 right-4 z-50 bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-xl max-w-sm animate-fade-in font-poppins">
      <div className="flex items-start gap-4">
        {/* Drag/Hand Icon */}
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0 text-2xl">
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-amber-800 text-sm">
            Drag Window to Projector
          </h3>

          <p className="text-amber-700 text-xs mt-2 leading-relaxed">
            Your browser doesn't support automatic display targeting. After the student window opens:
          </p>

          <ol className="text-amber-700 text-xs mt-3 space-y-2 list-decimal list-inside">
            <li>Grab the title bar of the new window</li>
            <li>Drag it to your projector/external display</li>
            <li>Press F11 or double-click to go fullscreen</li>
          </ol>

          <div className="mt-4 pt-3 border-t border-amber-200">
            <p className="text-amber-600 text-xs font-medium mb-2">
              Or open this URL directly on the projector:
            </p>

            <code className="block bg-white px-3 py-2 rounded-lg text-xs font-mono text-amber-900 break-all border border-amber-200">
              {studentUrl}
            </code>

            <button
              onClick={handleCopy}
              className={`mt-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualPlacementGuide;
