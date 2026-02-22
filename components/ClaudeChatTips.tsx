import React from 'react';
import { SUPPORTED_MARKERS } from '../services/scriptedParser/types';

// =============================================================================
// Props
// =============================================================================

interface ClaudeChatTipsProps {
  onClose: () => void;
  addToast: (message: string, duration?: number, variant?: 'success' | 'error' | 'info' | 'warning') => void;
}

// =============================================================================
// Marker Descriptions
// =============================================================================

/**
 * Human-readable descriptions for each supported marker.
 * Keyed by the marker string from SUPPORTED_MARKERS.
 */
const MARKER_DESCRIPTIONS: Record<string, string> = {
  'Say': 'Teacher script displayed on the teleprompter',
  'Ask': 'Student question shown on the presentation slide',
  'Write on board': 'Content displayed directly on the slide',
  'Activity': 'Hands-on activity or group work instruction',
};

// =============================================================================
// Example Snippet
// =============================================================================

const EXAMPLE_SNIPPET = `## Day 1: Introduction to Fractions

## Hook

Say: Today we're going to explore fractions. Has anyone ever shared a pizza equally?

Ask: If you cut a pizza into 4 equal slices and eat 1, what fraction did you eat?

### I Do

Say: Let me show you how we write fractions. The number on the bottom tells us how many equal parts we have.

Write on board: 1/4 means 1 out of 4 equal parts

Activity: Using the fraction strips on your desk, show me what 1/2 looks like. Compare with your partner.`;

// =============================================================================
// Prompt Template
// =============================================================================

const PROMPT_TEMPLATE = `You are helping a teacher create a lesson plan that will be imported into Cue, a presentation app for teachers. Generate the lesson plan using the exact format below.

TOPIC: [TOPIC]
GRADE LEVEL: [GRADE LEVEL]
NUMBER OF DAYS: [NUMBER OF DAYS]

FORMAT RULES:

1. Content Markers (each on its own line, followed by a colon and a space):
   - Say: (teacher script for the teleprompter)
   - Ask: (student question shown on the slide)
   - Write on board: (content displayed on the slide)
   - Activity: (hands-on activity or group work)

2. Section Headings (create slide boundaries):
   - ## Hook
   - ### I Do
   - ### We Do
   - ### You Do
   - ### Plenary

3. Day Headers (for multi-day plans):
   - ## Day 1: Title
   - ## Day 2: Title
   (and so on)

IMPORTANT:
- Every line of content MUST start with one of the markers above (Say:, Ask:, Write on board:, or Activity:).
- Use section headings to organize the lesson flow.
- Each section heading starts a new slide in the presentation.
- For multi-day plans, start each day with a Day header.
- Do NOT use bullet points, numbered lists, or any other formatting within marker content.
- Write naturally as if speaking to students.

Generate the lesson plan now.`;

// =============================================================================
// Clipboard Utility
// =============================================================================

/**
 * Copy text to clipboard with HTTPS fallback.
 * Primary: navigator.clipboard.writeText (requires HTTPS or localhost)
 * Fallback: document.execCommand('copy') via temporary textarea
 */
async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy approach
    }
  }
  // Legacy fallback for non-HTTPS environments
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

// =============================================================================
// Component
// =============================================================================

const ClaudeChatTips: React.FC<ClaudeChatTipsProps> = ({ onClose, addToast }) => {

  const handleCopyPrompt = async () => {
    const success = await copyToClipboard(PROMPT_TEMPLATE);
    if (success) {
      addToast('Copied to clipboard', 2000, 'success');
    } else {
      addToast('Failed to copy', 2000, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 my-8 relative">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white font-fredoka">
              Claude Chat Tips
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Generate Cue-compatible lesson plans
            </p>
          </div>

          {/* Format Specification */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 font-fredoka mb-4">
              Format Specification
            </h3>

            {/* Content Markers */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-indigo-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                Content Markers
              </h4>
              <div className="space-y-2">
                {SUPPORTED_MARKERS.map((marker) => (
                  <div key={marker} className="flex items-start gap-3">
                    <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-amber-400 px-2 py-0.5 rounded text-sm font-mono whitespace-nowrap">
                      {marker}:
                    </code>
                    <span className="text-slate-600 dark:text-slate-300 text-sm">
                      {MARKER_DESCRIPTIONS[marker] || marker}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section Headings */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-indigo-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                Section Headings
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                These create slide boundaries in the presentation:
              </p>
              <div className="flex flex-wrap gap-2">
                {['## Hook', '### I Do', '### We Do', '### You Do', '### Plenary'].map((heading) => (
                  <code
                    key={heading}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-sm font-mono"
                  >
                    {heading}
                  </code>
                ))}
              </div>
            </div>

            {/* Day Headers */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-indigo-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                Day Headers
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                Split multi-day lesson plans into separate days:
              </p>
              <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-sm font-mono">
                ## Day 1: Title
              </code>
            </div>
          </div>

          {/* Example Snippet */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 font-fredoka mb-3">
              Example
            </h3>
            <pre className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-sm font-mono text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {EXAMPLE_SNIPPET}
            </pre>
          </div>

          {/* Prompt Template */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 font-fredoka">
                Prompt Template
              </h3>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-indigo-700 dark:hover:bg-amber-400 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy Prompt
              </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
              Paste this into Claude (or any AI chat) and replace the placeholders:
            </p>
            <pre className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-sm font-mono text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto custom-scrollbar">
              {PROMPT_TEMPLATE}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaudeChatTips;
