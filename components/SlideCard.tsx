
import React, { useState, useEffect, useRef } from 'react';
import { Slide } from '../types';

interface SlideCardProps {
  slide: Slide;
  index: number;
  onUpdate: (id: string, updates: Partial<Slide>) => void;
  onRegenerateImage: (id: string, prompt: string) => void;
  onDelete: (id: string) => void;
  onRevise: (id: string, instruction: string) => Promise<void>;
  onInsertAfter: (index: number) => void;
  isAIAvailable: boolean;
  onRequestAI: (featureName: string) => void;
  onGenerateCaption?: (slideId: string) => Promise<void>;
  onImageSelected?: (slideId: string, dataUrl: string) => void;
}

const SlideCard: React.FC<SlideCardProps> = ({
  slide,
  index,
  onUpdate,
  onRegenerateImage,
  onDelete,
  onRevise,
  isAIAvailable,
  onRequestAI,
  onGenerateCaption,
  onImageSelected
}) => {
  const [localPrompt, setLocalPrompt] = useState(slide.imagePrompt);
  const [revisionInput, setRevisionInput] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Sync local prompt when slide changes
  useEffect(() => {
    setLocalPrompt(slide.imagePrompt);
  }, [slide.id, slide.imagePrompt]);

  const handlePointChange = (idx: number, val: string) => {
    const newContent = [...slide.content];
    newContent[idx] = val;
    onUpdate(slide.id, { content: newContent });
  };

  const handleMagicEdit = async () => {
    if (!revisionInput.trim()) return;
    if (!isAIAvailable) {
      onRequestAI('refine this slide with AI');
      return;
    }
    setIsRevising(true);
    await onRevise(slide.id, revisionInput);
    setRevisionInput('');
    setIsRevising(false);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[32px] shadow-xl hover:shadow-2xl dark:shadow-black/50 dark:hover:shadow-amber-500/10 border overflow-hidden flex flex-col min-h-[600px] transition-all relative group ring-1 ring-slate-100/50 dark:ring-0 ${slide.hasQuestionFlag ? 'border-amber-400 dark:border-amber-500 shadow-amber-100' : 'border-slate-200 dark:border-slate-800'}`}>
      
      {/* Question Flag Banner */}
      {slide.hasQuestionFlag && (
          <div className="bg-amber-400 text-slate-900 text-[10px] font-bold uppercase tracking-widest text-center py-1 flex items-center justify-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Question Focus Slide
          </div>
      )}

      {/* Slide Header Workspace */}
      <div className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 sticky top-0 z-20">
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg transition-colors ${slide.hasQuestionFlag ? 'bg-amber-400 text-slate-900 shadow-amber-500/20' : 'bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 shadow-indigo-200 dark:shadow-amber-500/20'}`}>
                {index + 1}
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Slide Workspace</h3>
                <div className="flex gap-2">
                   <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Layout: {slide.layout || 'split'}</span>
                   <span className="text-[10px] text-indigo-400 dark:text-amber-500 font-bold">•</span>
                   <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Theme: {slide.theme || 'default'}</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={() => onUpdate(slide.id, { hasQuestionFlag: !slide.hasQuestionFlag })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${slide.hasQuestionFlag ? 'bg-amber-400 text-slate-900 border-amber-500' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-500'}`}
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {slide.hasQuestionFlag ? 'Flagged' : 'Flag for Qs'}
            </button>
            <select 
              value={slide.layout} 
              onChange={(e) => onUpdate(slide.id, { layout: e.target.value as any })}
              className="text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-amber-500/50 focus:outline-none"
            >
                <option value="split">Split Layout</option>
                <option value="full-image">Full Image</option>
                <option value="flowchart">Flowchart</option>
                <option value="grid">Grid</option>
                <option value="tile-overlap">Tile Overlap</option>
            </select>
            <button 
              onClick={() => onDelete(slide.id)} 
              className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete Slide"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 p-10 overflow-y-auto space-y-10 custom-scrollbar">
          <div className="space-y-4">
             <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Headline</label>
             <input
               value={slide.title}
               onChange={(e) => onUpdate(slide.id, { title: e.target.value })}
               className="w-full font-fredoka font-bold text-4xl text-slate-800 dark:text-white border-b-2 border-slate-50 dark:border-slate-800 focus:border-indigo-200 dark:focus:border-amber-500/50 focus:outline-none py-2 transition-all bg-transparent"
               placeholder="Slide Title"
             />
          </div>

          <div className="space-y-6">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bullet Points</label>
            <div className="space-y-4">
                {slide.content.map((point, idx) => (
                <div key={idx} className="flex gap-4 items-start group/bullet bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-600 flex items-center justify-center text-indigo-400 dark:text-amber-400 font-bold text-sm shrink-0">
                        {idx + 1}
                    </div>
                    <textarea
                    value={point}
                    onChange={(e) => handlePointChange(idx, e.target.value)}
                    className="w-full text-lg text-slate-600 dark:text-slate-300 bg-transparent resize-none focus:outline-none placeholder:italic placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    rows={2}
                    placeholder={`Point ${idx + 1}...`}
                    />
                </div>
                ))}
            </div>
          </div>
          
          {/* Magic Edit Input */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
             <label className="text-[10px] font-bold text-indigo-500 dark:text-amber-500 uppercase tracking-widest mb-4 block">AI Concept Refinement</label>
             <div className="flex gap-3 bg-indigo-50/50 dark:bg-slate-800 p-2 rounded-2xl border border-indigo-100 dark:border-amber-500/20 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-amber-500/30 transition-all">
                <input 
                  value={revisionInput}
                  onChange={(e) => setRevisionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMagicEdit()}
                  placeholder="e.g., 'Simplify this for a 10 year old' or 'Add a real-world example'"
                  className="flex-1 text-sm bg-transparent border-0 rounded-lg px-4 py-2 focus:ring-0 placeholder:text-slate-400 dark:text-slate-200"
                />
                <div className="relative">
                  <button
                    onClick={handleMagicEdit}
                    disabled={isRevising || !revisionInput.trim()}
                    className={`bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 text-xs font-bold px-6 py-2 rounded-xl hover:bg-indigo-700 dark:hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md active:scale-95 ${!isAIAvailable ? 'opacity-50' : ''}`}
                    title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                  >
                    {isRevising ? 'Thinking...' : 'Revise'}
                  </button>
                  {!isAIAvailable && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-500 dark:bg-slate-600 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* Visual & Prompt Sidebar */}
        <div className="w-80 bg-slate-50 dark:bg-slate-950/50 border-l border-slate-100 dark:border-slate-800 p-8 flex flex-col gap-8">
          <div className="space-y-4">
             <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Slide Visual</label>
             <div className="aspect-square bg-white dark:bg-slate-800 rounded-3xl border-4 border-white dark:border-slate-700 overflow-hidden relative group/img shadow-2xl dark:shadow-black">
                {slide.isGeneratingImage ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-sm">
                    <div className="w-8 h-8 border-4 border-indigo-500 dark:border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-amber-500 uppercase">Painting...</span>
                </div>
                ) : slide.imageUrl ? (
                <img src={slide.imageUrl} className="w-full h-full object-cover" alt="Slide Visual" />
                ) : (
                <div
                    onClick={slide.layout === 'full-image' && onImageSelected ? () => imageFileInputRef.current?.click() : undefined}
                    className={`absolute inset-0 flex flex-col items-center justify-center text-[10px] text-slate-300 dark:text-slate-600 text-center p-8 bg-slate-50 dark:bg-slate-800 ${slide.layout === 'full-image' && onImageSelected ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors' : ''}`}
                >
                    <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {slide.layout === 'full-image' && onImageSelected ? 'Paste, drop, or click to add image' : 'No Image Yet'}
                    {slide.layout === 'full-image' && onImageSelected && (
                        <input
                            ref={imageFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                    if (reader.result) onImageSelected(slide.id, reader.result as string);
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                            }}
                            className="hidden"
                        />
                    )}
                </div>
                )}
                
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={() => {
                      if (!isAIAvailable) {
                        onRequestAI('regenerate this image');
                        return;
                      }
                      onRegenerateImage(slide.id, localPrompt);
                    }}
                    className={`p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl rounded-2xl text-indigo-600 dark:text-amber-500 opacity-0 group-hover/img:opacity-100 transition-all hover:scale-110 active:scale-90 border border-slate-100 dark:border-slate-600 ${!isAIAvailable ? '!opacity-50 group-hover/img:!opacity-50' : ''}`}
                    title={!isAIAvailable ? 'Add API key in Settings to enable' : 'Regenerate Visual'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth={2.5}/></svg>
                  </button>
                  {!isAIAvailable && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-500 dark:bg-slate-600 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
             </div>
          </div>
          
          {/* Generate AI Notes button for full-image slides (Phase 57) */}
          {slide.layout === 'full-image' && slide.imageUrl && onGenerateCaption && (
            <div>
              <button
                onClick={async () => {
                  if (!isAIAvailable) {
                    onRequestAI('generate AI notes for this image');
                    return;
                  }
                  setIsGeneratingCaption(true);
                  try {
                    await onGenerateCaption(slide.id);
                  } finally {
                    setIsGeneratingCaption(false);
                  }
                }}
                disabled={isGeneratingCaption}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 ${
                  isGeneratingCaption
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-wait'
                    : 'bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 hover:bg-indigo-700 dark:hover:bg-amber-400'
                } ${!isAIAvailable ? 'opacity-50' : ''}`}
                title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
              >
                {isGeneratingCaption ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    {slide.speakerNotes ? 'Regenerate AI Notes' : 'Generate AI Notes'}
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex-1 flex flex-col gap-3">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Artist Prompt</label>
            <textarea 
              value={localPrompt}
              onChange={(e) => setLocalPrompt(e.target.value)}
              onBlur={() => onUpdate(slide.id, { imagePrompt: localPrompt })}
              className="flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 resize-none focus:outline-none focus:border-indigo-300 dark:focus:border-amber-500/50 shadow-inner"
              placeholder="Describe the scene you want AI to paint..."
            />
            <p className="text-[9px] text-slate-400 dark:text-slate-600 italic">Be specific about colors, mood, and objects.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideCard;
