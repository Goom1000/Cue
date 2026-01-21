import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SavedClass, GradeLevel } from '../types';

// ============================================================================
// Types
// ============================================================================

interface ClassManagementModalProps {
  /** List of saved classes to display */
  classes: SavedClass[];
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when user renames a class */
  onRename: (classId: string, newName: string) => void;
  /** Callback when user updates students in a class */
  onUpdateStudents: (classId: string, students: string[]) => void;
  /** Callback when user deletes a class */
  onDelete: (classId: string, className: string) => void;
  /** Callback when user updates a student's grade */
  onUpdateGrade: (classId: string, studentName: string, grade: GradeLevel | null) => void;
  /** Currently loaded class name (for active indicator) */
  activeClassName: string | null;
}

// ============================================================================
// ClassManagementModal Component
// ============================================================================

/**
 * Modal for managing saved classes in the class bank.
 *
 * Features:
 * - View all saved classes with student counts
 * - Search/filter classes by name
 * - Inline rename (click name to edit)
 * - Expand-in-place student editing
 * - Delete with confirmation
 * - Active class indicator
 *
 * Follows existing modal patterns (ClassBankSaveModal, RecoveryModal):
 * - Fixed overlay with dark backdrop
 * - Centered modal card with rounded corners
 * - Dark mode support
 */
const ClassManagementModal: React.FC<ClassManagementModalProps> = ({
  classes,
  onClose,
  onRename,
  onUpdateStudents,
  onDelete,
  onUpdateGrade,
  activeClassName,
}) => {
  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Inline rename state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Expand-in-place student editing state
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const newStudentInputRef = useRef<HTMLInputElement>(null);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If editing name, cancel edit first
        if (editingClassId) {
          setEditingClassId(null);
          setEditName('');
          return;
        }
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, editingClassId]);

  // Focus rename input when entering edit mode
  useEffect(() => {
    if (editingClassId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingClassId]);

  // Focus new student input when expanding
  useEffect(() => {
    if (expandedClassId && newStudentInputRef.current) {
      newStudentInputRef.current.focus();
    }
  }, [expandedClassId]);

  // Filter and sort classes
  const filteredAndSortedClasses = useMemo(() => {
    let result = classes;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(query));
    }

    // Sort alphabetically by name
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, searchQuery]);

  // ============================================================================
  // Inline Rename Handlers
  // ============================================================================

  const handleStartRename = (classData: SavedClass) => {
    setEditingClassId(classData.id);
    setEditName(classData.name);
    // Collapse any expanded student editor
    setExpandedClassId(null);
  };

  const handleSaveRename = () => {
    if (!editingClassId) return;

    const trimmedName = editName.trim();
    if (trimmedName) {
      onRename(editingClassId, trimmedName);
    }

    setEditingClassId(null);
    setEditName('');
  };

  const handleCancelRename = () => {
    setEditingClassId(null);
    setEditName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  // ============================================================================
  // Student Editing Handlers
  // ============================================================================

  const handleToggleExpand = (classId: string) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
      setNewStudentName('');
    } else {
      setExpandedClassId(classId);
      setNewStudentName('');
      // Cancel any active rename
      setEditingClassId(null);
      setEditName('');
    }
  };

  const handleRemoveStudent = (classId: string, students: string[], studentName: string) => {
    const updatedStudents = students.filter((s) => s !== studentName);
    onUpdateStudents(classId, updatedStudents);
  };

  const handleAddStudent = (classId: string, students: string[]) => {
    const trimmedName = newStudentName.trim();
    if (!trimmedName) return;

    // Avoid duplicates
    if (!students.includes(trimmedName)) {
      onUpdateStudents(classId, [...students, trimmedName]);
    }
    setNewStudentName('');
    newStudentInputRef.current?.focus();
  };

  const handleAddStudentKeyDown = (e: React.KeyboardEvent, classId: string, students: string[]) => {
    if (e.key === 'Enter') {
      handleAddStudent(classId, students);
    }
  };

  // ============================================================================
  // Delete Handler
  // ============================================================================

  const handleDelete = (classId: string, className: string) => {
    if (window.confirm('Delete this class?')) {
      onDelete(classId, className);
    }
  };

  // ============================================================================
  // Grade Helper
  // ============================================================================

  const getStudentGrade = (classData: SavedClass, studentName: string): GradeLevel | null => {
    return classData.studentData?.find(s => s.name === studentName)?.grade ?? null;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka">
            Manage Classes
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View, rename, or delete your saved classes
          </p>
        </div>

        {/* Search Input */}
        <div className="px-6 pt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes..."
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-amber-500 focus:border-transparent transition-all text-sm"
          />
        </div>

        {/* Class List */}
        <div className="p-6 pt-4">
          {classes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                No saved classes
              </p>
            </div>
          ) : filteredAndSortedClasses.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                No matching classes
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1 -mx-2 px-2">
              {filteredAndSortedClasses.map((classData) => {
                const isEditing = editingClassId === classData.id;
                const isExpanded = expandedClassId === classData.id;
                const isActive = classData.name === activeClassName;

                return (
                  <div
                    key={classData.id}
                    className={`rounded-xl border transition-all ${
                      isExpanded
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {/* Class Row */}
                    <div className="flex items-center justify-between py-3 px-4">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleSaveRename}
                            onKeyDown={handleRenameKeyDown}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-indigo-500 dark:border-amber-500 rounded text-sm font-bold text-slate-700 dark:text-white focus:outline-none"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <p
                              onClick={() => handleStartRename(classData)}
                              className="text-sm font-bold text-slate-700 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-amber-400 transition-colors"
                              title="Click to rename"
                            >
                              {classData.name}
                            </p>
                            {isActive && (
                              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                active
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {classData.students.length} student{classData.students.length !== 1 ? 's' : ''}
                          {classData.studentData && classData.studentData.some(s => s.grade) && (
                            <span className="ml-2 text-[9px] text-indigo-500 dark:text-amber-400">
                              ({classData.studentData.filter(s => s.grade).length} graded)
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Edit Students Button */}
                        <button
                          onClick={() => handleToggleExpand(classData.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isExpanded
                              ? 'bg-indigo-100 dark:bg-amber-900/30 text-indigo-600 dark:text-amber-400'
                              : 'text-slate-400 hover:text-indigo-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Edit students"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(classData.id, classData.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete class"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Student Editor */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700 mt-1">
                        {/* Student Chips */}
                        <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                          {classData.students.length === 0 ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                              No students in this class
                            </span>
                          ) : (
                            classData.students.map((student) => {
                              const currentGrade = getStudentGrade(classData, student);
                              return (
                                <div
                                  key={student}
                                  className="flex items-center gap-1.5 bg-indigo-50 dark:bg-slate-700 text-indigo-700 dark:text-amber-400 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-indigo-100 dark:border-amber-500/20"
                                >
                                  {student}
                                  {/* Grade Select */}
                                  <select
                                    value={currentGrade || ''}
                                    onChange={(e) => onUpdateGrade(classData.id, student, (e.target.value || null) as GradeLevel | null)}
                                    className="ml-1 px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-[9px] text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-amber-500"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="">-</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                    <option value="E">E</option>
                                  </select>
                                  <button
                                    onClick={() => handleRemoveStudent(classData.id, classData.students, student)}
                                    className="text-indigo-300 dark:text-amber-600 hover:text-red-500 transition-colors"
                                  >
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Add Student Input */}
                        <div className="flex items-center gap-2">
                          <input
                            ref={newStudentInputRef}
                            type="text"
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                            onKeyDown={(e) => handleAddStudentKeyDown(e, classData.id, classData.students)}
                            placeholder="Add student..."
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-amber-500"
                          />
                          <button
                            onClick={() => handleAddStudent(classData.id, classData.students)}
                            disabled={!newStudentName.trim()}
                            className="p-1.5 bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 rounded-lg hover:bg-indigo-700 dark:hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Done Button */}
        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassManagementModal;
