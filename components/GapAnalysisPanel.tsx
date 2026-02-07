import React, { useState, useMemo } from 'react';
import { GapAnalysisResult, IdentifiedGap, GapSeverity } from '../services/aiProvider';

interface GapAnalysisPanelProps {
  result: GapAnalysisResult;
  onAddSlide: (gap: IdentifiedGap) => void;
  onReanalyze: () => void;
  onClose: () => void;
  generatingGapId: string | null;  // Currently generating gap (for spinner)
}

const severityConfig: Record<GapSeverity, { label: string; bg: string; text: string; order: number }> = {
  'critical': {
    label: 'Critical',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    order: 0
  },
  'recommended': {
    label: 'Recommended',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    order: 1
  },
  'nice-to-have': {
    label: 'Nice to Have',
    bg: 'bg-slate-100 dark:bg-slate-700',
    text: 'text-slate-500 dark:text-slate-400',
    order: 2
  }
};

const GapAnalysisPanel: React.FC<GapAnalysisPanelProps> = ({
  result,
  onAddSlide,
  onReanalyze,
  onClose,
  generatingGapId
}) => {
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());

  const toggleExpand = (gapId: string) => {
    setExpandedGaps(prev => {
      const next = new Set(prev);
      if (next.has(gapId)) {
        next.delete(gapId);
      } else {
        next.add(gapId);
      }
      return next;
    });
  };

  // Sort gaps by severity order: critical -> recommended -> nice-to-have
  const sortedGaps = useMemo(() => {
    return [...result.gaps].sort(
      (a, b) => severityConfig[a.severity].order - severityConfig[b.severity].order
    );
  }, [result.gaps]);

  // Count gaps by severity
  const severityCounts = useMemo(() => {
    const counts: Partial<Record<GapSeverity, number>> = {};
    for (const gap of result.gaps) {
      counts[gap.severity] = (counts[gap.severity] || 0) + 1;
    }
    return counts;
  }, [result.gaps]);

  // Coverage bar color based on percentage
  const coverageColor = result.coveragePercentage >= 80
    ? 'from-emerald-400 to-green-500'
    : result.coveragePercentage >= 50
    ? 'from-amber-400 to-yellow-500'
    : 'from-red-400 to-orange-500';

  // Empty state: no gaps found
  if (result.gaps.length === 0) {
    return (
      <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white font-fredoka">
            Gap Analysis
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white font-fredoka mb-2">
            Great Coverage!
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Your deck covers the lesson plan well. No significant gaps were found.
          </p>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ~{Math.round(result.coveragePercentage)}% covered
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onReanalyze}
            className="w-full px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Re-analyze
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 z-50 flex flex-col">

      {/* Header Section */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
        {/* Title bar */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white font-fredoka">
            Gap Analysis
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary banner */}
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-3 mb-3">
          <p className="text-xs text-teal-700 dark:text-teal-300 leading-relaxed">
            {result.summary}
          </p>
        </div>

        {/* Coverage bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Coverage
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              ~{Math.round(result.coveragePercentage)}%
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${coverageColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, result.coveragePercentage))}%` }}
            />
          </div>
        </div>

        {/* Gap count summary by severity */}
        <div className="flex flex-wrap gap-2">
          {(['critical', 'recommended', 'nice-to-have'] as GapSeverity[]).map(severity => {
            const count = severityCounts[severity];
            if (!count) return null;
            const config = severityConfig[severity];
            return (
              <span
                key={severity}
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text}`}
              >
                <span className={`w-2 h-2 rounded-full ${severity === 'critical' ? 'bg-red-500' : severity === 'recommended' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                {count} {config.label.toLowerCase()}
              </span>
            );
          })}
        </div>
      </div>

      {/* Gap List - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {sortedGaps.map((gap, idx) => {
          const config = severityConfig[gap.severity];
          const isExpanded = expandedGaps.has(gap.id);
          const isGenerating = generatingGapId === gap.id;
          const isAnyGenerating = generatingGapId !== null;

          return (
            <div
              key={gap.id}
              className={`p-3 ${idx < sortedGaps.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
            >
              {/* Severity badge + topic */}
              <div className="flex items-start gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.bg} ${config.text} shrink-0 mt-0.5`}>
                  {config.label}
                </span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                  {gap.topic}
                </h3>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                {gap.description}
              </p>

              {/* Lesson plan excerpt */}
              <p className="text-[11px] italic text-slate-400 dark:text-slate-500 mb-2 leading-relaxed">
                &ldquo;{gap.relatedLessonPlanExcerpt}&rdquo;
              </p>

              {/* Expand/collapse for suggested content */}
              <button
                onClick={() => toggleExpand(gap.id)}
                className="text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors mb-2"
              >
                {isExpanded ? 'Hide suggested content' : 'Show suggested content'}
              </button>

              {isExpanded && (
                <div className="mb-2 pl-2 border-l-2 border-teal-200 dark:border-teal-800">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {gap.suggestedTitle}
                  </p>
                  <ul className="space-y-0.5">
                    {gap.suggestedContent.slice(0, 3).map((bullet, i) => (
                      <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
                        <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-slate-400" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                    {gap.suggestedContent.length > 3 && (
                      <li className="text-[10px] text-slate-400 dark:text-slate-500 pl-2">
                        +{gap.suggestedContent.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Position hint */}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">
                Insert at position {gap.suggestedPosition + 1}
              </p>

              {/* Add Slide button */}
              <button
                onClick={() => onAddSlide(gap)}
                disabled={isAnyGenerating}
                className={`w-full px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isGenerating
                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 cursor-wait'
                    : isAnyGenerating
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Add Slide'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
        <button
          onClick={onReanalyze}
          className="w-full px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-2"
        >
          Re-analyze
        </button>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          Results may be outdated if you've made changes
        </p>
      </div>
    </div>
  );
};

export default GapAnalysisPanel;
