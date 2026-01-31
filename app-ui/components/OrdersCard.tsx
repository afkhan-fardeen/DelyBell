'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface OrdersCardProps {
  shop: string;
  currentSyncMode: 'auto' | 'manual';
  showToast: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

export default function OrdersCard({ shop, currentSyncMode, showToast }: OrdersCardProps) {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTab, setCurrentTab] = useState<'all' | 'synced' | 'pending' | 'failed'>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const pageSize = 10;
  const showCheckboxes = currentSyncMode === 'manual';

  // Reset selected orders when tab changes
  useEffect(() => {
    setSelectedOrders([]);
  }, [currentTab, currentPage]);

  // Load orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', shop, currentPage, currentTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('shop', shop);
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());

      if (currentTab !== 'all') {
        const statusMap = {
          synced: 'processed',
          pending: 'pending_sync',
          failed: 'failed',
        };
        params.append('status', statusMap[currentTab]);
      }

      const res = await axios.get(`/admin/api/orders?${params}`);
      return res.data;
    },
  });

  // Load stats for tabs
  const { data: statsData } = useQuery({
    queryKey: ['stats', shop],
    queryFn: async () => {
      const res = await axios.get(`/admin/api/stats?shop=${encodeURIComponent(shop)}`);
      return res.data.stats || {};
    },
  });

  // Sync selected orders mutation
  const syncSelectedMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const res = await axios.post('/admin/api/orders/sync-selected', { orderIds });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      showToast('success', 'Orders Synced', `Successfully synced ${data.synced || 0} order(s)`);
    },
    onError: (error: any) => {
      showToast('error', 'Sync Failed', error.response?.data?.error || 'Unknown error');
    },
  });

  // Retry order mutation
  const retryOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await axios.post(`/admin/api/orders/${orderId}/retry`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      showToast('success', 'Order Retried', 'Order retried successfully!');
    },
    onError: (error: any) => {
      showToast('error', 'Retry Failed', error.response?.data?.error || 'Unknown error');
    },
  });

  const orders = ordersData?.orders || [];
  const totalOrders = ordersData?.total || 0;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'processed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[11px] font-semibold rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span> Synced
        </span>
      );
    }
    if (status === 'pending_sync') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[11px] font-semibold rounded-full">
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5"></span> Pending
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-semibold rounded-full">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span> Failed
        </span>
      );
    }
    return <span className="text-slate-400">—</span>;
  };

  const getPaymentBadge = (financialStatus?: string) => {
    if (!financialStatus) return <span className="text-slate-400">—</span>;
    if (financialStatus === 'paid') {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-bold rounded border border-green-200 dark:border-green-900/50">
          <span className="material-icons-outlined text-[12px] mr-1">credit_card</span> PAID
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded border border-amber-200 dark:border-amber-900/50">
        <span className="material-icons-outlined text-[12px] mr-1">payments</span> COD
      </span>
    );
  };

  const handleSyncSelected = () => {
    const checked = Array.from(document.querySelectorAll<HTMLInputElement>('.order-checkbox:checked')).map((cb) => cb.value);
    if (checked.length === 0) {
      showToast('warning', 'No Selection', 'Please select at least one order');
      return;
    }
    syncSelectedMutation.mutate(checked);
  };

  const handleRetryOrder = (orderId: string) => {
    retryOrderMutation.mutate(orderId);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border-light dark:border-border-dark">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-bold text-xl">Orders</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="flex items-center gap-2 px-3 py-2 border border-border-light dark:border-border-dark rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
            >
              <span className="material-icons-outlined text-sm">refresh</span>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {showCheckboxes && selectedOrders.length > 0 && (
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-border-light dark:border-border-dark flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-600 dark:text-slate-400">{selectedOrders.length} selected</span>
          <button
            className="inline-flex items-center px-3 py-1.5 bg-primary text-white rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
            onClick={handleSyncSelected}
          >
            <span className="material-icons-outlined text-sm mr-1">sync</span> Sync Selected
          </button>
          <button
            className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md text-xs font-semibold hover:border-primary hover:text-primary transition-all"
            onClick={handleRetryFailed}
          >
            <span className="material-icons-outlined text-sm mr-1">refresh</span> Retry Failed
          </button>
        </div>
      )}

      {/* Order Tabs */}
      <div className="flex items-center space-x-6 px-6 mt-6 border-b border-border-light dark:border-border-dark -mb-6">
        <button
          className={`pb-3 border-b-2 text-sm flex items-center space-x-2 ${
            currentTab === 'all'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
          }`}
          onClick={() => setCurrentTab('all')}
        >
          <span>All Orders</span>
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">{statsData?.totalOrdersToday || 0}</span>
        </button>
        <button
          className={`pb-3 border-b-2 text-sm flex items-center space-x-2 ${
            currentTab === 'synced'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
          }`}
          onClick={() => setCurrentTab('synced')}
        >
          <span>Synced</span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-[10px]">
            {statsData?.successfullySynced || 0}
          </span>
        </button>
        <button
          className={`pb-3 border-b-2 text-sm flex items-center space-x-2 ${
            currentTab === 'pending'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
          }`}
          onClick={() => setCurrentTab('pending')}
        >
          <span>Pending</span>
          <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-2 py-0.5 rounded-full text-[10px]">
            {statsData?.pendingSync || 0}
          </span>
        </button>
        <button
          className={`pb-3 border-b-2 text-sm flex items-center space-x-2 ${
            currentTab === 'failed'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
          }`}
          onClick={() => setCurrentTab('failed')}
        >
          <span>Failed</span>
          <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px]">
            {statsData?.failed || 0}
          </span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {showCheckboxes && (
                <th className="px-6 py-4">
                  <input type="checkbox" checked={selectedOrders.length > 0 && selectedOrders.length === orders.filter((o: any) => o.status === 'pending_sync' || o.status === 'failed').length} onChange={toggleSelectAll} />
                </th>
              )}
              <th className="px-6 py-4">Order #</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-center">Payment</th>
              <th className="px-6 py-4">Sync Status</th>
              <th className="px-6 py-4">Delybell Order ID</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {isLoading ? (
              <tr>
                <td colSpan={showCheckboxes ? 7 : 6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                  <div>Loading orders...</div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={showCheckboxes ? 7 : 6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  <span className="material-icons-outlined text-4xl mb-2 block">inbox</span>
                  <div className="font-semibold">No orders yet</div>
                  <div className="text-sm mt-1">Orders will appear here once they are synced.</div>
                </td>
              </tr>
            ) : (
              orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  {showCheckboxes && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="order-checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        disabled={order.status !== 'pending_sync' && order.status !== 'failed'}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 font-semibold text-sm">#{order.shopifyOrderNumber || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4 text-center">{getPaymentBadge(order.financialStatus)}</td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">{order.delybellOrderId || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    {order.status === 'failed' && (
                      <button
                        className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md text-xs font-semibold hover:border-primary hover:text-primary dark:hover:text-primary transition-all shadow-sm"
                        onClick={() => handleRetryOrder(order.id)}
                      >
                        <span className="material-icons-outlined text-sm mr-1">refresh</span> Retry
                      </button>
                    )}
                    {order.status === 'pending_sync' && currentSyncMode === 'manual' && (
                      <button
                        className="inline-flex items-center px-3 py-1.5 bg-primary text-white rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                        onClick={() => syncSelectedMutation.mutate([order.id])}
                      >
                        <span className="material-icons-outlined text-sm mr-1">sync</span> Sync
                      </button>
                    )}
                    {order.status === 'processed' && (
                      <button className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md text-xs font-semibold text-slate-400 cursor-not-allowed opacity-50">
                        <span className="material-icons-outlined text-sm mr-1">visibility</span> View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-border-light dark:border-border-dark">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {totalOrders === 0 ? 'No orders' : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, totalOrders)} of ${totalOrders} orders`}
        </span>
        <div className="flex space-x-2">
          <button
            className={`p-1 px-3 border border-border-light dark:border-border-dark rounded bg-white dark:bg-surface-dark text-sm ${
              currentPage === 1
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <button
            className={`p-1 px-3 border border-border-light dark:border-border-dark rounded bg-white dark:bg-surface-dark text-sm ${
              currentPage * pageSize >= totalOrders
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage * pageSize >= totalOrders}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
