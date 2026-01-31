'use client';

import { useState } from 'react';

interface SyncModeCardProps {
  shop: string;
  currentSyncMode: 'auto' | 'manual';
  onUpdateSyncMode: (mode: 'auto' | 'manual') => void;
}

export default function SyncModeCard({ shop, currentSyncMode, onUpdateSyncMode }: SyncModeCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleModeChange = async (mode: 'auto' | 'manual') => {
    if (mode === currentSyncMode) return;
    setIsUpdating(true);
    try {
      onUpdateSyncMode(mode);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark mb-8 overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className="font-semibold text-lg">Order Sync Mode</h2>
          <span
            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
              currentSyncMode === 'auto'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            }`}
          >
            {currentSyncMode === 'auto' ? 'Auto' : 'Manual'}
          </span>
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              currentSyncMode === 'auto'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            onClick={() => handleModeChange('auto')}
            disabled={isUpdating}
          >
            Auto Sync
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              currentSyncMode === 'manual'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            onClick={() => handleModeChange('manual')}
            disabled={isUpdating}
          >
            Manual Sync
          </button>
        </div>
      </div>
      <div className="p-6">
        {currentSyncMode === 'auto' ? (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 flex items-start space-x-3">
            <span className="material-icons-outlined text-blue-600 dark:text-blue-400 mt-0.5">info</span>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">How Auto Sync Works</h3>
              <p className="text-blue-800 dark:text-blue-400/80 text-sm mt-1 leading-relaxed">
                When a customer places an order in your Shopify store, it will <span className="font-bold">automatically sync to Delybell</span> within seconds. No action needed from you — orders appear in Delybell immediately.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg p-4 flex items-start space-x-3">
            <span className="material-icons-outlined text-yellow-600 dark:text-yellow-400 mt-0.5">info</span>
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 text-sm">How Manual Sync Works</h3>
              <p className="text-yellow-800 dark:text-yellow-400/80 text-sm mt-1 leading-relaxed">
                Orders are <span className="font-bold">saved but not synced automatically</span>. You can review orders and choose which ones to sync to Delybell. Use the checkboxes in the orders table below to select orders, then click "Sync Selected" when ready.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
