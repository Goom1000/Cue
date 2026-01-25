import React from 'react';
import { Slide } from '../types';

// --- SHARED COMPONENTS ---

export const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  // 1. Clean leading bullets/hyphens (e.g. "- Point" -> "Point")
  // This prevents double-bulleting if the AI adds its own markers.
  const cleanText = text ? text.replace(/^\s*[\-\•\*\.]+\s*/, '') : "";

  // Split by bold markers AND script headers (Text only, no emojis)
  const parts = cleanText.split(/(\*\*.*?\*\*|\*.*?\*|.*? READS:|TEACHER ELABORATES:|INTRO:)/g);
  
  return (
    <span>
      {parts.map((part, i) => {
        // Bold
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          // FIX: Removed 'text-white' so it inherits parent color (visible on white slides)
          return <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          // FIX: Removed 'text-white'
          return <strong key={i} className="font-extrabold">{part.slice(1, -1)}</strong>;
        }

        // Script Headers (Color Coding & Spacing) - Text Only
        if (part.includes('READS:')) {
           return <span key={i} className="block mt-6 mb-2 text-pink-400 font-bold uppercase tracking-wider text-xl border-l-4 border-pink-400 pl-3">{part}</span>;
        }
        if (part.includes('TEACHER ELABORATES:')) {
           return <span key={i} className="block mt-6 mb-2 text-indigo-400 font-bold uppercase tracking-wider text-xl border-l-4 border-indigo-400 pl-3">{part}</span>;
        }
        if (part.includes('INTRO:')) {
           return <span key={i} className="block mb-2 text-amber-400 font-bold uppercase tracking-wider text-xl border-l-4 border-amber-400 pl-3">{part}</span>;
        }

        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

// --- LAYOUTS ---

export const DefaultLayout: React.FC<{ slide: Slide, visibleBullets: number }> = ({ slide, visibleBullets }) => (
  <div 
    className="w-full h-full flex flex-col md:flex-row overflow-hidden relative"
    style={{ backgroundColor: slide.backgroundColor || '#ffffff' }}
  >
      <div className={`flex flex-col justify-center p-6 md:p-12 space-y-6 md:space-y-10 relative z-10 w-full ${slide.imageUrl ? 'md:w-1/2' : 'md:w-[90%] mx-auto'}`}>
          <h2 className="text-6xl md:text-8xl font-bold text-slate-800 leading-tight font-poppins">
              {slide.title}
          </h2>
          <div className="space-y-6 md:space-y-8">
              {slide.content.map((point, idx) => (
                  <div 
                      key={idx} 
                      className={`flex gap-4 md:gap-6 items-start transition-all duration-500 transform ${idx < visibleBullets ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
                  >
                      <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-amber-400 mt-3 md:mt-4 shrink-0" />
                      <div className="text-3xl md:text-5xl font-semibold leading-relaxed text-slate-700 text-left">
                           <MarkdownText text={point} />
                      </div>
                  </div>
              ))}
          </div>
      </div>
      {/* Right Image */}
      {slide.imageUrl && (
          <div className="hidden md:block md:w-1/2 bg-indigo-50 relative overflow-hidden h-full">
              <img 
                  src={slide.imageUrl} 
                  alt="Slide visual" 
                  className="w-full h-full object-cover transition-transform duration-[20s] hover:scale-110 ease-linear transform scale-100"
              />
          </div>
      )}
  </div>
);

export const FullImageLayout: React.FC<{ slide: Slide, visibleBullets: number }> = ({ slide, visibleBullets }) => (
    <div 
      className="w-full h-full relative flex flex-col items-center justify-center text-center p-8 overflow-hidden"
      style={{ backgroundColor: slide.backgroundColor || '#000000' }}
    >
        {slide.imageUrl && (
            <div className="absolute inset-0 z-0">
                    <img src={slide.imageUrl} className="w-full h-full object-cover opacity-60" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/70"></div>
            </div>
        )}
        <div className="relative z-10 w-[90%] space-y-12">
            <h2 className="text-6xl md:text-9xl font-bold text-white drop-shadow-lg font-poppins">
                {slide.title}
            </h2>
            <div className="space-y-8 flex flex-col items-center">
                {slide.content.map((point, idx) => (
                    <div 
                        key={idx} 
                        className={`transition-all duration-700 transform ${idx < visibleBullets ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'}`}
                    >
                        <div className="text-4xl md:text-6xl font-bold text-white leading-normal drop-shadow-md bg-black/30 backdrop-blur-sm px-8 py-4 rounded-2xl">
                             <MarkdownText text={point} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const FlowchartLayout: React.FC<{ slide: Slide, visibleBullets: number }> = ({ slide, visibleBullets }) => (
    <div 
      className="w-full h-full flex flex-col p-6 md:p-10 relative overflow-hidden"
      style={{ backgroundColor: slide.backgroundColor || '#f8fafc' }}
    >
         {/* Top Image Banner (if exists) */}
         {slide.imageUrl && (
            <div className="w-full h-[35%] bg-indigo-100 rounded-2xl overflow-hidden mb-6 md:mb-10 shadow-md shrink-0 relative group">
                 <img 
                    src={slide.imageUrl} 
                    className="w-full h-full object-cover object-center" 
                    alt="Process context" 
                 />
            </div>
         )}

         <div className="text-center mb-10 shrink-0">
            <h2 className="text-5xl md:text-7xl font-bold text-indigo-700 inline-block px-8 py-2 border-b-4 border-amber-400 font-poppins">
                {slide.title}
            </h2>
         </div>
         
         <div className="flex w-full px-4 gap-4 md:gap-6 flex-1 items-stretch justify-center">
            {slide.content.map((point, idx) => (
                <React.Fragment key={idx}>
                    {/* Arrow (except first) */}
                    {idx > 0 && (
                        <div className={`transition-all duration-500 delay-100 shrink-0 flex items-center justify-center px-2 ${idx < visibleBullets ? 'opacity-100' : 'opacity-0'}`}>
                            <svg className="w-8 h-8 md:w-16 md:h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    )}
                    
                    {/* Card */}
                    <div className={`flex-1 min-w-0 transition-all duration-500 transform ${idx < visibleBullets ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                        <div className={`
                             h-full rounded-3xl p-4 md:p-8 flex items-center justify-center text-center shadow-xl border-b-[8px] md:border-b-[12px] w-full
                             ${idx % 3 === 0 ? 'bg-indigo-600 border-indigo-800 text-white' : ''}
                             ${idx % 3 === 1 ? 'bg-amber-400 border-amber-600 text-indigo-900' : ''}
                             ${idx % 3 === 2 ? 'bg-emerald-600 border-emerald-800 text-white' : ''}
                        `}>
                            <div className="text-xl md:text-3xl font-bold leading-tight break-words">
                                <MarkdownText text={point} />
                            </div>
                        </div>
                    </div>
                </React.Fragment>
            ))}
         </div>
    </div>
);

export const GridLayout: React.FC<{ slide: Slide, visibleBullets: number }> = ({ slide, visibleBullets }) => {
    // Check if total items is odd to handle the last item centering
    const isOddTotal = slide.content.length % 2 !== 0;

    // Helper to determine color classes based on theme
    const getColorClass = (idx: number) => {
        const theme = slide.theme || 'default';
        
        if (theme === 'purple') {
            const colors = [
                'bg-purple-600 text-white border-purple-400', 
                'bg-purple-500 text-white border-purple-300', 
                'bg-fuchsia-600 text-white border-fuchsia-400', 
                'bg-indigo-500 text-white border-indigo-300'
            ];
            return colors[idx % colors.length];
        }
        
        if (theme === 'blue') {
            const colors = [
                'bg-blue-600 text-white border-blue-400', 
                'bg-sky-500 text-white border-sky-300', 
                'bg-cyan-600 text-white border-cyan-400', 
                'bg-indigo-600 text-white border-indigo-400'
            ];
            return colors[idx % colors.length];
        }

        if (theme === 'green') {
            const colors = [
                'bg-emerald-600 text-white border-emerald-400', 
                'bg-green-500 text-white border-green-300', 
                'bg-teal-600 text-white border-teal-400', 
                'bg-lime-600 text-white border-lime-400'
            ];
            return colors[idx % colors.length];
        }

        if (theme === 'warm') {
             const colors = [
                'bg-amber-500 text-white border-amber-300', 
                'bg-orange-500 text-white border-orange-300', 
                'bg-red-500 text-white border-red-300', 
                'bg-yellow-500 text-indigo-900 border-yellow-300'
            ];
            return colors[idx % colors.length];
        }

        // Default Rainbow
        if (idx === 0) return 'bg-white/10 text-white border-white/10';
        if (idx === 1) return 'bg-amber-400 text-indigo-900 border-amber-200';
        if (idx === 2) return 'bg-pink-500 text-white border-pink-300';
        if (idx === 3) return 'bg-sky-400 text-indigo-900 border-sky-200';
        return 'bg-slate-700 text-white border-slate-500';
    };

    return (
        <div 
            className="w-full h-full flex flex-col p-6 md:p-10 overflow-hidden relative transition-colors duration-500"
            style={{ backgroundColor: slide.backgroundColor || '#0f172a' }}
        >
            <h2 className="text-5xl md:text-7xl text-white font-bold text-center mb-10 z-10 relative font-poppins drop-shadow-md">
                {slide.title}
            </h2>
            
            <div className="flex-1 grid grid-cols-2 auto-rows-fr gap-8 max-w-7xl mx-auto w-full z-10 relative">
                {slide.content.map((point, idx) => {
                    // If it's the last item and the total is odd, make it span 2 columns
                    const isLast = idx === slide.content.length - 1;
                    const spanClass = (isLast && isOddTotal) ? 'col-span-2' : '';

                    return (
                        <div 
                            key={idx}
                            className={`
                                h-full rounded-3xl p-8 md:p-14 flex items-center justify-center text-center shadow-lg border-2 backdrop-blur-sm transition-all duration-500
                                ${spanClass}
                                ${getColorClass(idx)}
                                ${idx < visibleBullets ? 'opacity-100' : 'opacity-0'}
                            `}
                        >
                            <div className="text-3xl md:text-5xl font-bold">
                                <MarkdownText text={point} />
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Decorative Grid BG */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '40px 40px' }}></div>
        </div>
    );
};

export const TileOverlapLayout: React.FC<{ slide: Slide, visibleBullets: number }> = ({ slide, visibleBullets }) => {
    // Logic: Only show ONE tile at a time.
    // If visibleBullets = 0 -> Show Title/Cover Card.
    // If visibleBullets = 1 -> Show Content[0]
    
    // activeIndex is the current card to show.
    // visibleBullets is 1-based index (0=none, 1=first item).
    const activeIndex = visibleBullets > 0 ? visibleBullets - 1 : -1;

    // Colors
    const colors = [
        'bg-emerald-100 border-emerald-300 text-emerald-900', 
        'bg-sky-100 border-sky-300 text-sky-900', 
        'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900', 
        'bg-amber-100 border-amber-300 text-amber-900'
    ];
    
    return (
        <div 
            className="w-full h-full flex flex-col md:flex-row overflow-hidden relative" 
            style={{ backgroundColor: slide.backgroundColor || '#ffffff' }}
        >
             {/* Left: Content Stack */}
             <div className="flex-1 relative p-8 md:p-12 flex flex-col justify-center items-center z-10">
                <h2 className="text-4xl md:text-6xl font-bold mb-10 text-slate-800 z-10 relative font-poppins text-center">
                    {slide.title}
                </h2>
                
                <div className="relative w-full max-w-2xl aspect-[4/3]">
                   {slide.content.map((point, idx) => {
                       const isActive = idx === activeIndex;
                       const isPast = idx < activeIndex;
                       const isFuture = idx > activeIndex;

                       return (
                          <div 
                              key={idx}
                              className={`
                                  absolute inset-0 p-8 md:p-12 rounded-3xl border-4 shadow-2xl flex flex-col items-center justify-center text-center transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) origin-bottom
                                  ${colors[idx % colors.length]}
                                  ${isActive ? 'opacity-100 scale-100 translate-x-0 rotate-0 z-20' : ''}
                                  ${isPast ? 'opacity-0 -translate-x-[120%] rotate-[-20deg] z-10' : ''}
                                  ${isFuture ? 'opacity-0 translate-x-[120%] rotate-[20deg] scale-90 z-0' : ''}
                              `}
                          >
                              <div className="text-2xl md:text-4xl font-semibold leading-relaxed">
                                  <MarkdownText text={point} />
                              </div>
                          </div>
                       );
                   })}
                   
                   {/* COVER CARD (Visible when visibleBullets === 0) */}
                   <div className={`
                       absolute inset-0 p-8 md:p-12 rounded-3xl border-4 border-slate-100 shadow-2xl flex flex-col items-center justify-center text-center transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) origin-bottom bg-white
                       ${visibleBullets === 0 ? 'opacity-100 scale-100 translate-x-0 rotate-0 z-30' : 'opacity-0 -translate-x-[120%] rotate-[-20deg] z-0'}
                   `}>
                       <div className="text-6xl mb-4 animate-bounce">✨</div>
                       <h3 className="text-3xl font-bold text-slate-700">Overview</h3>
                       <p className="text-slate-500 mt-2 text-xl">Click to reveal details...</p>
                   </div>
                </div>
             </div>

             {/* Right: Image */}
             {slide.imageUrl && (
                <div className="hidden md:block w-1/3 h-full relative border-l-4 border-white shadow-2xl z-20">
                   <img src={slide.imageUrl} className="w-full h-full object-cover" alt="Slide visual" />
                </div>
             )}
        </div>
    );
};

// Work Together layout with activity instructions and optional pair display
export const WorkTogetherLayout: React.FC<{ slide: Slide, visibleBullets: number }> = ({ slide, visibleBullets }) => (
  <div
    className="w-full h-full flex flex-col overflow-hidden"
    style={{ backgroundColor: slide.backgroundColor || '#0d9488' }}  // Teal-600
  >
    {/* Header */}
    <div className="px-6 md:px-10 pt-6 md:pt-8">
      <h2 className="text-5xl md:text-7xl font-bold text-white text-center font-poppins">
        {slide.title}
      </h2>
    </div>

    {/* Main content area */}
    <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 overflow-hidden">
      {/* Left: Activity Instructions */}
      <div className="flex-1 bg-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-sm overflow-auto">
        <h3 className="text-xl md:text-2xl font-bold text-white/80 mb-3 md:mb-4 uppercase tracking-wider">Instructions</h3>
        <div className="space-y-3 md:space-y-4">
          {slide.content.map((point, idx) => (
            <div
              key={idx}
              className={`flex gap-3 md:gap-4 items-start transition-all duration-500 ${
                idx < visibleBullets ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-amber-400 text-teal-900 font-bold flex items-center justify-center shrink-0 text-sm md:text-base">
                {idx + 1}
              </div>
              <p className="text-xl md:text-2xl lg:text-3xl text-white font-medium leading-relaxed">
                <MarkdownText text={point} />
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Student Pairs (if available) */}
      {slide.pairs && slide.pairs.length > 0 ? (
        <div className="w-full md:w-1/3 bg-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-sm overflow-auto">
          <h3 className="text-xl md:text-2xl font-bold text-white/80 mb-3 md:mb-4 uppercase tracking-wider">Your Pairs</h3>
          <ul className="space-y-2 text-lg md:text-xl text-white">
            {slide.pairs.map((pair, idx) => (
              <li
                key={idx}
                className={`py-1.5 px-3 rounded-lg ${pair.isGroupOfThree ? 'bg-amber-500/20 text-amber-200' : 'bg-white/5'}`}
              >
                {pair.students.join(' & ')}
                {pair.isGroupOfThree && <span className="ml-2 text-amber-300 text-sm">(group of 3)</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="w-full md:w-1/3 bg-white/5 rounded-2xl p-4 md:p-6 border-2 border-dashed border-white/20 flex items-center justify-center">
          <p className="text-white/40 text-center text-lg">
            Load a class list to show pairs here
          </p>
        </div>
      )}
    </div>
  </div>
);

export const SlideContentRenderer: React.FC<{ slide: Slide, visibleBullets: number }> = ({ slide, visibleBullets }) => {
    switch (slide.layout) {
        case 'full-image':
            return <FullImageLayout slide={slide} visibleBullets={visibleBullets} />;
        case 'flowchart':
            return <FlowchartLayout slide={slide} visibleBullets={visibleBullets} />;
        case 'grid':
            return <GridLayout slide={slide} visibleBullets={visibleBullets} />;
        case 'tile-overlap':
            return <TileOverlapLayout slide={slide} visibleBullets={visibleBullets} />;
        case 'work-together':
            return <WorkTogetherLayout slide={slide} visibleBullets={visibleBullets} />;
        default:
            return <DefaultLayout slide={slide} visibleBullets={visibleBullets} />;
    }
};