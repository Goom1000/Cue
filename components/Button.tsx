
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning' | 'ghost-dim';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled, 
  ...props 
}) => {
  const baseStyles = "px-6 py-2 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  // Theme logic: 
  // Primary: Indigo (Light) -> Amber (Dark)
  // Secondary: White/Indigo (Light) -> DarkGray/Amber (Dark)
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:bg-amber-500 dark:text-slate-900 dark:hover:bg-amber-400 dark:shadow-amber-500/20",
    secondary: "bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-200 hover:bg-indigo-50 dark:bg-slate-800 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-slate-700 dark:hover:border-amber-400/50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-200 dark:shadow-none",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200 dark:bg-amber-600 dark:text-white",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
    "ghost-dim": "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent hover:border-slate-600",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
