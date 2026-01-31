'use client';

import { useState } from 'react';

export default function SettingsCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark mb-8">
      <button
        className="w-full px-6 py-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <span className="material-icons-outlined text-slate-400 group-hover:text-primary transition-colors">settings</span>
          <span className="font-semibold">Sync Settings</span>
        </div>
        <span className="material-icons-outlined text-slate-400">{isExpanded ? 'expand_less' : 'expand_more'}</span>
      </button>
      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed space-y-2">
            <p>Service type and payment settings are automatically configured based on your Shopify store settings.</p>
            <p>Orders with pending payment are automatically marked as Cash on Delivery (COD) in Delybell.</p>
          </div>
        </div>
      )}
    </div>
  );
}
