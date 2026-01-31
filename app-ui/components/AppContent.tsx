'use client';

import { useState, useEffect } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import HealthCards from './HealthCards';
import SyncModeCard from './SyncModeCard';
import SettingsCard from './SettingsCard';
import OrdersCard from './OrdersCard';
import ToastContainer from './ToastContainer';
import DarkModeToggle from './DarkModeToggle';

interface AppContentProps {
  shop: string;
}

export default function AppContent({ shop }: AppContentProps) {
  const app = useAppBridge();
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'warning'; title: string; message?: string }>>([]);

  // Load connection health
  const { data: health } = useQuery({
    queryKey: ['health', shop],
    queryFn: async () => {
      const [authRes, delybellRes, statsRes] = await Promise.all([
        axios.get(`/auth/check?shop=${encodeURIComponent(shop)}`),
        axios.get('/admin/api/delybell-health').catch(() => ({ data: { success: false } })),
        axios.get(`/admin/api/stats?shop=${encodeURIComponent(shop)}`).catch(() => ({ data: { success: false, stats: {} } })),
      ]);

      return {
        shopify: authRes.data.authenticated || false,
        delybell: delybellRes.data.success || false,
        lastSync: statsRes.data.success && statsRes.data.stats.successfullySynced > 0 ? 'Just now' : null,
        storeDomain: shop,
      };
    },
    refetchInterval: 30000,
  });

  // Load sync mode
  const { data: syncModeData } = useQuery({
    queryKey: ['syncMode', shop],
    queryFn: async () => {
      const res = await axios.get(`/admin/api/shops/${encodeURIComponent(shop)}/sync-mode`);
      return res.data.sync_mode || 'manual';
    },
  });

  const currentSyncMode = syncModeData || 'manual';

  // Update sync mode mutation
  const updateSyncModeMutation = useMutation({
    mutationFn: async (mode: 'auto' | 'manual') => {
      const res = await axios.post(`/admin/api/shops/${encodeURIComponent(shop)}/sync-mode`, {
        sync_mode: mode,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncMode', shop] });
      showToast('success', 'Sync Mode Updated', `Switched to ${currentSyncMode === 'auto' ? 'Auto Sync' : 'Manual Sync'} mode`);
    },
    onError: (error: any) => {
      showToast('error', 'Update Failed', error.response?.data?.error || 'Failed to update sync mode');
    },
  });

  const showToast = (type: 'success' | 'error' | 'warning', title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const updateSyncMode = (mode: 'auto' | 'manual') => {
    updateSyncModeMutation.mutate(mode);
  };

  if (!health) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      <DarkModeToggle />

      {/* Header */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Delybell Order Sync</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Simple delivery automation for your Shopify store</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Help Center
          </button>
          <button
            className="px-4 py-2 bg-primary text-white rounded font-medium text-sm hover:opacity-90 transition-opacity"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
          >
            Sync Now
          </button>
        </div>
      </header>

      {/* Health Cards */}
      <HealthCards health={health} />

      {/* Sync Mode Card */}
      <SyncModeCard shop={shop} currentSyncMode={currentSyncMode} onUpdateSyncMode={updateSyncMode} />

      {/* Settings Card */}
      <SettingsCard />

      {/* Orders Card */}
      <OrdersCard shop={shop} currentSyncMode={currentSyncMode} showToast={showToast} />
    </div>
  );
}
