/**
 * Shop Repository
 * Single source of truth for shop data (Supabase)
 */

const { supabase } = require('./db');

/**
 * Upsert shop data (insert or update)
 * @param {Object} params - Shop data
 * @param {string} params.shop - Shop domain (e.g., 'store.myshopify.com')
 * @param {string} params.accessToken - Shopify access token
 * @param {string} params.scopes - OAuth scopes
 * @param {string} params.syncMode - Sync mode: "auto" | "manual" (optional, defaults to "auto")
 * @returns {Promise<Object>} Supabase response
 */
async function upsertShop({ shop, accessToken, scopes, syncMode = 'manual' }) {
  if (!process.env.SUPABASE_URL) {
    throw new Error('Supabase not configured. Set SUPABASE_URL environment variable.');
  }

  console.log(`[ShopRepo] Upserting shop: ${shop} (sync_mode: ${syncMode})`);
  
  const { data, error } = await supabase
    .from('shops')
    .upsert(
      {
        shop,
        access_token: accessToken,
        scopes,
        sync_mode: syncMode, // Default to 'auto' if not provided
        installed_at: new Date().toISOString(),
      },
      {
        onConflict: 'shop',
      }
    )
    .select()
    .single();

  if (error) {
    console.error(`[ShopRepo] Error upserting shop ${shop}:`, error.message);
    throw error;
  }

  console.log(`[ShopRepo] ✅ Shop ${shop} saved successfully`);
  return data;
}

/**
 * Get shop data by shop domain
 * @param {string} shop - Shop domain (e.g., 'store.myshopify.com')
 * @returns {Promise<Object|null>} Shop data or null if not found
 */
async function getShop(shop) {
  if (!process.env.SUPABASE_URL) {
    console.warn('[ShopRepo] Supabase not configured, returning null');
    return null;
  }

  console.log(`[ShopRepo] Fetching shop: ${shop}`);
  
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('shop', shop)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned (shop not found)
      console.log(`[ShopRepo] Shop ${shop} not found`);
      return null;
    }
    console.error(`[ShopRepo] Error fetching shop ${shop}:`, error.message);
    throw error;
  }

  console.log(`[ShopRepo] ✅ Shop ${shop} found`);
  return data;
}

/**
 * Delete shop data (on uninstall)
 * @param {string} shop - Shop domain
 * @returns {Promise<boolean>} Success status
 */
async function deleteShop(shop) {
  if (!process.env.SUPABASE_URL) {
    console.warn('[ShopRepo] Supabase not configured, skipping delete');
    return false;
  }

  console.log(`[ShopRepo] Deleting shop: ${shop}`);
  
  const { error } = await supabase
    .from('shops')
    .delete()
    .eq('shop', shop);

  if (error) {
    console.error(`[ShopRepo] Error deleting shop ${shop}:`, error.message);
    return false;
  }

  console.log(`[ShopRepo] ✅ Shop ${shop} deleted`);
  return true;
}

/**
 * Get all shops (for debugging/admin)
 * @returns {Promise<Array>} Array of shops
 */
async function getAllShops() {
  if (!process.env.SUPABASE_URL) {
    return [];
  }

  const { data, error } = await supabase
    .from('shops')
    .select('shop, installed_at, sync_mode')
    .order('installed_at', { ascending: false });

  if (error) {
    console.error('[ShopRepo] Error fetching all shops:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Update shop sync mode
 * CRITICAL: When switching to auto, set auto_sync_enabled_at timestamp
 * This ensures we NEVER auto-sync orders created before auto mode was enabled
 * @param {string} shop - Shop domain
 * @param {string} syncMode - Sync mode: "auto" | "manual"
 * @returns {Promise<Object>} Updated shop data
 */
async function updateSyncMode(shop, syncMode) {
  if (!process.env.SUPABASE_URL) {
    throw new Error('Supabase not configured. Set SUPABASE_URL environment variable.');
  }

  if (syncMode !== 'auto' && syncMode !== 'manual') {
    throw new Error('sync_mode must be "auto" or "manual"');
  }

  console.log(`[ShopRepo] Updating sync_mode for shop ${shop} to ${syncMode}`);
  
  // Build update object
  const updateData = { sync_mode: syncMode };
  
  // CRITICAL RULE: Set auto_sync_enabled_at when switching TO auto mode
  // This timestamp is used to prevent auto-syncing orders created before auto mode was enabled
  if (syncMode === 'auto') {
    // Only set if not already set (preserve original enable time)
    const currentShop = await getShop(shop);
    if (!currentShop || !currentShop.auto_sync_enabled_at) {
      updateData.auto_sync_enabled_at = new Date().toISOString();
      console.log(`[ShopRepo] Setting auto_sync_enabled_at for shop ${shop}`);
    }
  }
  // When switching back to manual, we keep auto_sync_enabled_at for historical reference
  
  const { data, error } = await supabase
    .from('shops')
    .update(updateData)
    .eq('shop', shop)
    .select()
    .single();

  if (error) {
    console.error(`[ShopRepo] Error updating sync_mode for shop ${shop}:`, error.message);
    throw error;
  }

  console.log(`[ShopRepo] ✅ Sync mode updated for shop ${shop} to ${syncMode}`);
  if (syncMode === 'auto' && updateData.auto_sync_enabled_at) {
    console.log(`[ShopRepo] ⚠️ Auto sync enabled. Only orders created AFTER ${updateData.auto_sync_enabled_at} will be auto-synced.`);
  }
  
  return data;
}

module.exports = {
  upsertShop,
  getShop,
  deleteShop,
  getAllShops,
  updateSyncMode,
};
