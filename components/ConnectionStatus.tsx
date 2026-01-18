import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

/**
 * Visual status chip showing connection state between teacher and student windows.
 * Shows green pulse when connected, gray when disconnected.
 */
const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  if (isConnected) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-400 border border-green-500/30">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
        </span>
        Connected
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-slate-700/50 text-slate-400 border border-slate-600/30">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 border border-slate-500 bg-transparent"></span>
      </span>
      Disconnected
    </div>
  );
};

export default ConnectionStatus;
