import React from 'react';
import { createPortal } from 'react-dom';
import { Slide } from '../types';
import FloatingWindow from './FloatingWindow';

interface NextSlidePreviewProps {
  nextSlide: Slide | null;
  isVisible: boolean;
  onToggle: () => void;
}

/**
 * Toggleable preview panel showing the next slide's content.
 * Renders as a freely draggable and resizable floating window.
 * Helps presenters see what's coming without looking at the projector.
 */
const NextSlidePreview: React.FC<NextSlidePreviewProps> = ({
  nextSlide,
  isVisible,
  onToggle,
}) => {
  // Calculate default position (bottom-right area of viewport)
  // Using function to get current viewport size at render time
  const getDefaultPosition = () => ({
    x: Math.max(0, window.innerWidth - 220),
    y: Math.max(0, window.innerHeight - 200),
  });

  const defaultSize = { width: 200, height: 150 };

  return (
    <>
      {/* Toggle Button - stays in header toolbar */}
      <button
        onClick={onToggle}
        title="Toggle next slide preview"
        className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 border border-slate-600"
      >
        {isVisible ? 'Hide Preview' : 'Preview'}
      </button>

      {/* Floating Preview Panel - rendered via Portal for z-index isolation */}
      {isVisible &&
        createPortal(
          <FloatingWindow
            defaultPosition={getDefaultPosition()}
            defaultSize={defaultSize}
            minWidth={200}
            minHeight={150}
            aspectRatio={16 / 9}
            zIndex={9999}
          >
            {/* Content - clean window, no header label per CONTEXT.md */}
            <div className="w-full h-full bg-slate-800">
              <div className="aspect-video">
                {nextSlide ? (
                  <div className="h-full w-full bg-white p-2 overflow-hidden">
                    {/* Title */}
                    <div className="text-[10px] font-bold text-slate-800 truncate mb-1">
                      {nextSlide.title}
                    </div>
                    {/* First 3 bullets */}
                    <div className="space-y-0.5">
                      {nextSlide.content.slice(0, 3).map((bullet, idx) => (
                        <div
                          key={idx}
                          className="text-[8px] text-slate-600 truncate leading-tight"
                        >
                          {bullet}
                        </div>
                      ))}
                      {nextSlide.content.length > 3 && (
                        <div className="text-[8px] text-slate-400 italic">
                          +{nextSlide.content.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full bg-slate-900 flex items-center justify-center">
                    <span className="text-[10px] text-slate-500">
                      End of presentation
                    </span>
                  </div>
                )}
              </div>
            </div>
          </FloatingWindow>,
          document.body
        )}
    </>
  );
};

export default NextSlidePreview;
