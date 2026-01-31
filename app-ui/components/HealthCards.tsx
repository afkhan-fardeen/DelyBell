interface HealthCardsProps {
  health: {
    shopify: boolean;
    delybell: boolean;
    lastSync: string | null;
    storeDomain: string;
  };
}

export default function HealthCards({ health }: HealthCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex items-center space-x-4">
        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
          <span className="material-icons-outlined text-green-600 dark:text-green-400">check_circle</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shopify</p>
          <p className="font-semibold">{health.shopify ? 'Connected' : 'Not Connected'}</p>
        </div>
      </div>
      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex items-center space-x-4">
        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
          <span className="material-icons-outlined text-green-600 dark:text-green-400">check_circle</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delybell</p>
          <p className="font-semibold">{health.delybell ? 'Connected' : 'Not Connected'}</p>
        </div>
      </div>
      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex items-center space-x-4">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
          <span className="material-icons-outlined text-blue-600 dark:text-blue-400">storefront</span>
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Store URL</p>
          <p className="font-semibold truncate">{health.storeDomain}</p>
        </div>
      </div>
      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex items-center space-x-4">
        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
          <span className="material-icons-outlined text-slate-600 dark:text-slate-400">schedule</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Sync</p>
          <p className="font-semibold">{health.lastSync || 'No syncs yet'}</p>
        </div>
      </div>
    </div>
  );
}
