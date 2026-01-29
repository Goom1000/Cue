import React, { useState, useRef, useCallback } from 'react';
import { UploadedResource, UploadValidationError } from '../types';
import { processUploadedFile, getAcceptedExtensions } from '../services/uploadService';

interface UploadPanelProps {
  resources: UploadedResource[];
  onResourcesChange: (resources: UploadedResource[]) => void;
  onError?: (error: UploadValidationError) => void;
}

interface UploadState {
  status: 'idle' | 'processing' | 'error';
  currentFile?: string;
  progress: number;  // 0-100, or -1 for indeterminate
  error?: UploadValidationError;
}

const UploadPanel: React.FC<UploadPanelProps> = ({ resources, onResourcesChange, onError }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle', progress: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setUploadState({ status: 'processing', progress: 0, currentFile: files[0].name });

    const newResources: UploadedResource[] = [];
    const errors: UploadValidationError[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadState({
        status: 'processing',
        progress: Math.round(((i) / files.length) * 100),
        currentFile: file.name
      });

      try {
        const resource = await processUploadedFile(file);
        newResources.push(resource);
      } catch (err) {
        const error = err as UploadValidationError;
        errors.push({ ...error, message: `${file.name}: ${error.message}` });
        if (onError) onError(error);
      }
    }

    // Add successful uploads to existing resources
    if (newResources.length > 0) {
      onResourcesChange([...resources, ...newResources]);
    }

    // Show error state if any files failed
    if (errors.length > 0) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: errors[0]  // Show first error
      });
      // Auto-clear error after 5 seconds
      setTimeout(() => setUploadState({ status: 'idle', progress: 0 }), 5000);
    } else {
      setUploadState({ status: 'idle', progress: 0 });
    }
  }, [resources, onResourcesChange, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, [processFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await processFiles(files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveResource = useCallback((id: string) => {
    onResourcesChange(resources.filter(r => r.id !== id));
  }, [resources, onResourcesChange]);

  const renderUploadZone = () => {
    if (uploadState.status === 'processing') {
      return (
        <div className="w-full px-4">
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${Math.max(uploadState.progress, 10)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center truncate">
            Processing {uploadState.currentFile}...
          </p>
        </div>
      );
    }

    if (uploadState.status === 'error' && uploadState.error) {
      return (
        <div className="text-center px-4">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{uploadState.error.message}</p>
          <p className="text-xs text-slate-400 mt-1">Click or drag to try again</p>
        </div>
      );
    }

    // Default idle state
    return (
      <>
        <svg className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Drag files here</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">PDF, images, or Word docs</p>
        <button
          type="button"
          onClick={handleBrowseClick}
          className="mt-3 px-4 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          Browse Files
        </button>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={uploadState.status === 'idle' ? handleBrowseClick : undefined}
        className={`
          border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center
          cursor-pointer transition-all min-h-[160px]
          ${isDragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]'
            : uploadState.status === 'error'
              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/50'
          }
        `}
      >
        {renderUploadZone()}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedExtensions()}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Uploaded Resources Preview Grid */}
      {resources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Uploaded ({resources.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="relative group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
              >
                {/* Thumbnail */}
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 mb-2">
                  <img
                    src={resource.thumbnail}
                    alt={resource.filename}
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* Filename */}
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium" title={resource.filename}>
                  {resource.filename}
                </p>
                {/* Page count badge */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded font-medium uppercase">
                    {resource.type}
                  </span>
                  {resource.pageCount > 1 && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {resource.type === 'docx' ? '~' : ''}{resource.pageCount} pg
                    </span>
                  )}
                </div>
                {/* Remove button */}
                <button
                  onClick={() => handleRemoveResource(resource.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-slate-900/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPanel;
