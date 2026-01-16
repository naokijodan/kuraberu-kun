/**
 * しらべる君 - セラー管理モジュール
 * セラー・カテゴリのデータ管理を行う共通モジュール
 */

const SellerManager = (function() {
  'use strict';

  // 現在のスキーマバージョン
  const SCHEMA_VERSION = 1;

  // セラータイプ定義
  const SELLER_TYPES = {
    supplier: { label: '仕入れ先', color: '#4caf50', icon: '🛒' },
    rival: { label: 'ライバル', color: '#2196f3', icon: '🎯' },
    caution: { label: '要注意', color: '#f44336', icon: '⚠️' },
    other: { label: 'その他', color: '#9e9e9e', icon: '📌' }
  };

  // ストレージキー
  const STORAGE_KEYS = {
    VERSION: 'shiraberu_seller_data_version',
    CATEGORIES: 'shiraberu_categories',
    SELLERS: 'shiraberu_sellers',
    LAST_CATEGORY: 'shiraberu_last_category_id'
  };

  /**
   * UUIDを生成
   */
  function generateId(prefix = '') {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    return prefix ? `${prefix}_${uuid}` : uuid;
  }

  /**
   * データの初期化・マイグレーション
   */
  async function initializeData() {
    try {
      const data = await chrome.storage.local.get([
        STORAGE_KEYS.VERSION,
        STORAGE_KEYS.CATEGORIES,
        STORAGE_KEYS.SELLERS
      ]);

      const currentVersion = data[STORAGE_KEYS.VERSION] || 0;

      // 初回または未初期化の場合
      if (currentVersion === 0) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.VERSION]: SCHEMA_VERSION,
          [STORAGE_KEYS.CATEGORIES]: {},
          [STORAGE_KEYS.SELLERS]: {},
          [STORAGE_KEYS.LAST_CATEGORY]: null
        });
        console.log('[SellerManager] データ初期化完了');
        return;
      }

      // マイグレーションが必要な場合（将来用）
      if (currentVersion < SCHEMA_VERSION) {
        await migrateData(currentVersion, SCHEMA_VERSION, data);
      }
    } catch (error) {
      console.error('[SellerManager] 初期化エラー:', error);
    }
  }

  /**
   * データマイグレーション（将来用）
   */
  async function migrateData(fromVersion, toVersion, data) {
    console.log(`[SellerManager] マイグレーション: v${fromVersion} → v${toVersion}`);

    // 将来のバージョンアップ時にここにマイグレーションロジックを追加
    // 例: if (fromVersion === 1 && toVersion === 2) { ... }

    await chrome.storage.local.set({
      [STORAGE_KEYS.VERSION]: toVersion
    });
  }

  /**
   * 全カテゴリを取得
   */
  async function getCategories() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.CATEGORIES);
    return data[STORAGE_KEYS.CATEGORIES] || {};
  }

  /**
   * カテゴリを配列形式で取得（ソート済み）
   */
  async function getCategoriesArray() {
    const categories = await getCategories();
    return Object.entries(categories)
      .map(([id, cat]) => ({ id, ...cat }))
      .sort((a, b) => a.order - b.order);
  }

  /**
   * カテゴリを追加
   */
  async function addCategory(name) {
    const categories = await getCategories();
    const id = generateId('cat');
    const maxOrder = Object.values(categories).reduce((max, cat) => Math.max(max, cat.order || 0), -1);

    categories[id] = {
      name: name.trim(),
      order: maxOrder + 1,
      createdAt: new Date().toISOString()
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.CATEGORIES]: categories });
    console.log('[SellerManager] カテゴリ追加:', id, name);
    return id;
  }

  /**
   * カテゴリを更新
   */
  async function updateCategory(id, updates) {
    const categories = await getCategories();
    if (!categories[id]) {
      throw new Error('カテゴリが見つかりません');
    }

    categories[id] = { ...categories[id], ...updates };
    await chrome.storage.local.set({ [STORAGE_KEYS.CATEGORIES]: categories });
    console.log('[SellerManager] カテゴリ更新:', id);
  }

  /**
   * カテゴリを削除（セラーは残る、紐付けのみ解除）
   */
  async function deleteCategory(id) {
    const [categories, sellers] = await Promise.all([
      getCategories(),
      getSellers()
    ]);

    if (!categories[id]) {
      throw new Error('カテゴリが見つかりません');
    }

    // カテゴリを削除
    delete categories[id];

    // セラーからこのカテゴリへの紐付けを解除
    for (const sellerId in sellers) {
      const seller = sellers[sellerId];
      if (seller.categoryIds && seller.categoryIds.includes(id)) {
        seller.categoryIds = seller.categoryIds.filter(catId => catId !== id);
      }
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.CATEGORIES]: categories,
      [STORAGE_KEYS.SELLERS]: sellers
    });

    console.log('[SellerManager] カテゴリ削除:', id);
  }

  /**
   * カテゴリの並び順を更新
   */
  async function reorderCategories(orderedIds) {
    const categories = await getCategories();

    orderedIds.forEach((id, index) => {
      if (categories[id]) {
        categories[id].order = index;
      }
    });

    await chrome.storage.local.set({ [STORAGE_KEYS.CATEGORIES]: categories });
    console.log('[SellerManager] カテゴリ並び替え完了');
  }

  /**
   * 全セラーを取得
   */
  async function getSellers() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SELLERS);
    return data[STORAGE_KEYS.SELLERS] || {};
  }

  /**
   * セラーを配列形式で取得
   */
  async function getSellersArray(filterOptions = {}) {
    const sellers = await getSellers();
    let result = Object.entries(sellers).map(([id, seller]) => ({ id, ...seller }));

    // カテゴリでフィルター
    if (filterOptions.categoryId) {
      result = result.filter(s => s.categoryIds && s.categoryIds.includes(filterOptions.categoryId));
    }

    // タイプでフィルター
    if (filterOptions.type) {
      result = result.filter(s => s.type === filterOptions.type);
    }

    // プラットフォームでフィルター
    if (filterOptions.platform) {
      result = result.filter(s => s.platform === filterOptions.platform);
    }

    // 日付でソート（新しい順）
    result.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    return result;
  }

  /**
   * セラーIDを生成（プラットフォーム + サイト内ID）
   */
  function generateSellerId(platform, platformId) {
    return `seller_${platform}_${platformId}`;
  }

  /**
   * セラーが既に保存されているかチェック
   */
  async function isSellerSaved(platform, platformId) {
    const sellers = await getSellers();
    const sellerId = generateSellerId(platform, platformId);
    return !!sellers[sellerId];
  }

  /**
   * 保存済みセラーを取得
   */
  async function getSavedSeller(platform, platformId) {
    const sellers = await getSellers();
    const sellerId = generateSellerId(platform, platformId);
    if (sellers[sellerId]) {
      return { id: sellerId, ...sellers[sellerId] };
    }
    return null;
  }

  /**
   * セラーを保存（新規または既存にカテゴリ追加）
   */
  async function saveSeller(sellerData) {
    const sellers = await getSellers();
    const sellerId = generateSellerId(sellerData.platform, sellerData.platformId);

    if (sellers[sellerId]) {
      // 既存セラー → カテゴリを追加
      const existingCategoryIds = sellers[sellerId].categoryIds || [];
      const newCategoryIds = sellerData.categoryIds || [];
      const mergedCategoryIds = [...new Set([...existingCategoryIds, ...newCategoryIds])];

      sellers[sellerId] = {
        ...sellers[sellerId],
        categoryIds: mergedCategoryIds,
        // タイプとメモは上書き可能
        type: sellerData.type || sellers[sellerId].type,
        memo: sellerData.memo !== undefined ? sellerData.memo : sellers[sellerId].memo
      };
      console.log('[SellerManager] セラー更新（カテゴリ追加）:', sellerId);
    } else {
      // 新規セラー
      sellers[sellerId] = {
        platform: sellerData.platform,
        platformId: sellerData.platformId,
        name: sellerData.name,
        url: sellerData.url,
        categoryIds: sellerData.categoryIds || [],
        type: sellerData.type || 'other',
        memo: sellerData.memo || '',
        savedAt: new Date().toISOString()
      };
      console.log('[SellerManager] セラー新規保存:', sellerId);
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.SELLERS]: sellers });

    // 最後に使用したカテゴリを記憶
    if (sellerData.categoryIds && sellerData.categoryIds.length > 0) {
      await setLastCategoryId(sellerData.categoryIds[0]);
    }

    return sellerId;
  }

  /**
   * セラーを更新
   */
  async function updateSeller(sellerId, updates) {
    const sellers = await getSellers();
    if (!sellers[sellerId]) {
      throw new Error('セラーが見つかりません');
    }

    sellers[sellerId] = { ...sellers[sellerId], ...updates };
    await chrome.storage.local.set({ [STORAGE_KEYS.SELLERS]: sellers });
    console.log('[SellerManager] セラー更新:', sellerId);
  }

  /**
   * セラーを削除
   */
  async function deleteSeller(sellerId) {
    const sellers = await getSellers();
    if (!sellers[sellerId]) {
      throw new Error('セラーが見つかりません');
    }

    delete sellers[sellerId];
    await chrome.storage.local.set({ [STORAGE_KEYS.SELLERS]: sellers });
    console.log('[SellerManager] セラー削除:', sellerId);
  }

  /**
   * セラーからカテゴリを削除
   */
  async function removeSellerFromCategory(sellerId, categoryId) {
    const sellers = await getSellers();
    if (!sellers[sellerId]) {
      throw new Error('セラーが見つかりません');
    }

    sellers[sellerId].categoryIds = (sellers[sellerId].categoryIds || [])
      .filter(id => id !== categoryId);

    await chrome.storage.local.set({ [STORAGE_KEYS.SELLERS]: sellers });
    console.log('[SellerManager] セラーからカテゴリ削除:', sellerId, categoryId);
  }

  /**
   * 最後に使用したカテゴリIDを取得
   */
  async function getLastCategoryId() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.LAST_CATEGORY);
    return data[STORAGE_KEYS.LAST_CATEGORY] || null;
  }

  /**
   * 最後に使用したカテゴリIDを設定
   */
  async function setLastCategoryId(categoryId) {
    await chrome.storage.local.set({ [STORAGE_KEYS.LAST_CATEGORY]: categoryId });
  }

  /**
   * エクスポート（JSON形式）
   */
  async function exportData() {
    const [categories, sellers] = await Promise.all([
      getCategories(),
      getSellers()
    ]);

    return {
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      categories,
      sellers
    };
  }

  /**
   * エクスポート（CSV形式）
   */
  async function exportCSV() {
    const [categories, sellers] = await Promise.all([
      getCategories(),
      getSellers()
    ]);

    const headers = ['カテゴリ', 'プラットフォーム', 'セラー名', 'セラーID', 'URL', 'タイプ', 'メモ', '登録日'];
    const rows = [headers.join(',')];

    for (const [sellerId, seller] of Object.entries(sellers)) {
      const categoryNames = (seller.categoryIds || [])
        .map(catId => categories[catId]?.name || '')
        .filter(name => name)
        .join('; ');

      const typeLabel = SELLER_TYPES[seller.type]?.label || seller.type;

      const row = [
        `"${categoryNames}"`,
        seller.platform,
        `"${seller.name}"`,
        seller.platformId,
        `"${seller.url}"`,
        typeLabel,
        `"${(seller.memo || '').replace(/"/g, '""')}"`,
        seller.savedAt
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * インポート（JSON形式）
   */
  async function importData(jsonData) {
    if (!jsonData.version || !jsonData.categories || !jsonData.sellers) {
      throw new Error('無効なデータ形式です');
    }

    // バージョンチェック
    if (jsonData.version > SCHEMA_VERSION) {
      throw new Error('このデータは新しいバージョンで作成されています。拡張機能を更新してください。');
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.VERSION]: SCHEMA_VERSION,
      [STORAGE_KEYS.CATEGORIES]: jsonData.categories,
      [STORAGE_KEYS.SELLERS]: jsonData.sellers
    });

    console.log('[SellerManager] データインポート完了');
  }

  /**
   * 統計情報を取得
   */
  async function getStats() {
    const [categories, sellers] = await Promise.all([
      getCategories(),
      getSellers()
    ]);

    const sellerArray = Object.values(sellers);

    return {
      totalCategories: Object.keys(categories).length,
      totalSellers: sellerArray.length,
      byPlatform: {
        mercari: sellerArray.filter(s => s.platform === 'mercari').length,
        ebay: sellerArray.filter(s => s.platform === 'ebay').length
      },
      byType: {
        supplier: sellerArray.filter(s => s.type === 'supplier').length,
        rival: sellerArray.filter(s => s.type === 'rival').length,
        caution: sellerArray.filter(s => s.type === 'caution').length,
        other: sellerArray.filter(s => s.type === 'other').length
      }
    };
  }

  // 公開API
  return {
    SELLER_TYPES,
    STORAGE_KEYS,
    initializeData,
    // カテゴリ
    getCategories,
    getCategoriesArray,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    // セラー
    getSellers,
    getSellersArray,
    generateSellerId,
    isSellerSaved,
    getSavedSeller,
    saveSeller,
    updateSeller,
    deleteSeller,
    removeSellerFromCategory,
    // ユーティリティ
    getLastCategoryId,
    setLastCategoryId,
    exportData,
    exportCSV,
    importData,
    getStats
  };
})();

// Service Worker / Content Script 両方で使えるようにエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SellerManager;
}
