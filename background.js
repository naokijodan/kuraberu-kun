/**
 * しらべる君 - Background Service Worker
 * OpenAI API呼び出し、タブ操作をバックグラウンドで実行
 */

// OpenAI API設定
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

// 翻訳オプションの定義
const TRANSLATION_OPTIONS = {
  brand: { ja: 'ブランド名', en: 'brand name', example_ja: 'エルメス、ルイヴィトン', example_en: 'Hermes, Louis Vuitton' },
  category: { ja: 'カテゴリ', en: 'category/product type', example_ja: 'スカーフ、財布、バッグ', example_en: 'scarf, wallet, bag' },
  material: { ja: '素材', en: 'material', example_ja: 'シルク、レザー、コットン', example_en: 'silk, leather, cotton' },
  model: { ja: '型番/モデル名', en: 'model number/name', example_ja: 'カレ90、ネヴァーフル', example_en: 'Carre 90, Neverfull' },
  character: { ja: 'キャラクター名', en: 'character name', example_ja: 'ピカチュウ、リザードン', example_en: 'Pikachu, Charizard' },
  color: { ja: '色', en: 'color', example_ja: '赤、黒、ネイビー', example_en: 'red, black, navy' },
  size: { ja: 'サイズ', en: 'size', example_ja: 'M、L、90cm', example_en: 'M, L, 90cm' },
  rarity: { ja: 'レアリティ', en: 'rarity', example_ja: 'SR、SSR、レア', example_en: 'SR, SSR, rare' }
};

/**
 * 選択されたオプションからeBay用プロンプトを生成
 */
function buildEbayPrompt(selectedOptions) {
  const allOptions = ['brand', 'category', 'material', 'model', 'character', 'color', 'size', 'rarity'];

  const includeTexts = selectedOptions.map(opt => {
    const info = TRANSLATION_OPTIONS[opt];
    return info ? `- ${info.en}` : null;
  }).filter(Boolean);

  const excludeOptions = allOptions.filter(opt => !selectedOptions.includes(opt));
  const excludeTexts = excludeOptions.map(opt => {
    const info = TRANSLATION_OPTIONS[opt];
    return info ? `- ${info.en}（${info.example_en}）` : null;
  }).filter(Boolean);

  if (includeTexts.length === 0) {
    includeTexts.push('- brand name', '- category/product type');
  }

  return `日本語の商品情報を英語のeBay検索キーワードに変換してください。

【含める要素】
${includeTexts.join('\n')}

【絶対に含めない要素】
${excludeTexts.join('\n')}
- 状態（美品、未使用等）
- 送料、販売条件

【重要】
含める要素に指定されたものだけを出力してください。
絶対に含めない要素に該当する情報は、元のタイトルに含まれていても出力しないでください。

【出力形式】
英語キーワードのみを1行で出力。説明や前置きは不要。

【入力】
`;
}

/**
 * 選択されたオプションからメルカリ用プロンプトを生成
 */
function buildMercariPrompt(selectedOptions) {
  const allOptions = ['brand', 'category', 'material', 'model', 'character', 'color', 'size', 'rarity'];

  const includeTexts = selectedOptions.map(opt => {
    const info = TRANSLATION_OPTIONS[opt];
    return info ? `- ${info.ja}` : null;
  }).filter(Boolean);

  const excludeOptions = allOptions.filter(opt => !selectedOptions.includes(opt));
  const excludeTexts = excludeOptions.map(opt => {
    const info = TRANSLATION_OPTIONS[opt];
    return info ? `- ${info.ja}（${info.example_ja}）` : null;
  }).filter(Boolean);

  if (includeTexts.length === 0) {
    includeTexts.push('- ブランド名', '- カテゴリ');
  }

  return `英語の商品タイトルを日本語のメルカリ検索キーワードに変換してください。

【含める要素】
${includeTexts.join('\n')}

【絶対に含めない要素】
${excludeTexts.join('\n')}
- 状態（New, Used, 美品等）
- 送料、販売条件

【重要】
含める要素に指定されたものだけを出力してください。
絶対に含めない要素に該当する情報は、元のタイトルに含まれていても出力しないでください。
ブランド名はカタカナ表記（例: Hermes→エルメス）、カテゴリは日本語（例: cardigan→カーディガン）に変換。

【出力形式】
日本語キーワードのみを1行で出力。説明や前置きは不要。

【入力】
`;
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[しらべる君 BG] メッセージ受信:', request.action);

  if (request.action === 'generateKeyword') {
    // OpenAI APIでキーワード生成（タイトル＋説明）
    // options: 選択された要素の配列（例: ['brand', 'category', 'material']）
    generateEbayKeyword(request.title, request.description, request.options || ['brand', 'category'])
      .then(keyword => sendResponse({ success: true, keyword }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンス
  }

  if (request.action === 'generateMercariKeyword') {
    // OpenAI APIでメルカリ検索キーワード生成（英語→日本語）
    // options: 選択された要素の配列（例: ['brand', 'category', 'material']）
    generateMercariKeyword(request.title, request.options || ['brand', 'category'])
      .then(keyword => sendResponse({ success: true, keyword }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンス
  }

  if (request.action === 'openTab') {
    // 新しいタブを開く
    chrome.tabs.create({
      url: request.url,
      active: request.active !== false
    }, (tab) => {
      console.log('[しらべる君 BG] タブを開きました:', request.url);
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  if (request.action === 'openInBackground') {
    // バックグラウンドでタブを開く
    chrome.tabs.create({
      url: request.url,
      active: false
    }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  if (request.action === 'checkApiKey') {
    // APIキーの存在確認
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      sendResponse({ hasKey: !!result.openaiApiKey });
    });
    return true;
  }

  if (request.action === 'openOptionsPage') {
    // 設定画面を開く
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
});

/**
 * OpenAI APIでeBay検索キーワードを生成
 * @param {string} title - 商品タイトル
 * @param {string} description - 商品説明
 * @param {Array} options - 選択された要素の配列（例: ['brand', 'category', 'material']）
 */
async function generateEbayKeyword(title, description = '', options = ['brand', 'category']) {
  // APIキーを取得
  const result = await chrome.storage.sync.get(['openaiApiKey']);
  const apiKey = result.openaiApiKey;

  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。拡張機能の設定画面でAPIキーを入力してください。');
  }

  console.log('[しらべる君 BG] OpenAI API呼び出し開始');
  console.log('[しらべる君 BG] タイトル:', title);
  console.log('[しらべる君 BG] 説明:', description?.substring(0, 100));
  console.log('[しらべる君 BG] 選択オプション:', options);

  // タイトルと説明を組み合わせた入力を作成
  let inputText = `タイトル: ${title}`;
  if (description && description.trim()) {
    inputText += `\n\n説明文: ${description}`;
  }

  // 選択されたオプションからプロンプトを生成
  const prompt = buildEbayPrompt(options);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt + inputText
        }
      ],
      max_tokens: 100,
      temperature: 0.3  // 低めで一貫性のある出力
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('[しらべる君 BG] OpenAI APIエラー:', error);

    if (response.status === 401) {
      throw new Error('APIキーが無効です。正しいOpenAI APIキーを設定してください。');
    }
    throw new Error(error.error?.message || `APIエラー: ${response.status}`);
  }

  const data = await response.json();
  const keyword = data.choices[0].message.content.trim();

  console.log('[しらべる君 BG] キーワード生成成功:', keyword);
  return keyword;
}

/**
 * OpenAI APIでメルカリ検索キーワードを生成（英語→日本語）
 * @param {string} title - 英語の商品タイトル
 * @param {Array} options - 選択された要素の配列（例: ['brand', 'category', 'material']）
 */
async function generateMercariKeyword(title, options = ['brand', 'category']) {
  // APIキーを取得
  const result = await chrome.storage.sync.get(['openaiApiKey']);
  const apiKey = result.openaiApiKey;

  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。拡張機能の設定画面でAPIキーを入力してください。');
  }

  console.log('[しらべる君 BG] メルカリキーワード生成開始');
  console.log('[しらべる君 BG] 英語タイトル:', title);
  console.log('[しらべる君 BG] 選択オプション:', options);

  // 選択されたオプションからプロンプトを生成
  const prompt = buildMercariPrompt(options);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt + title
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('[しらべる君 BG] OpenAI APIエラー:', error);

    if (response.status === 401) {
      throw new Error('APIキーが無効です。正しいOpenAI APIキーを設定してください。');
    }
    throw new Error(error.error?.message || `APIエラー: ${response.status}`);
  }

  const data = await response.json();
  const keyword = data.choices[0].message.content.trim();

  console.log('[しらべる君 BG] メルカリキーワード生成成功:', keyword);
  return keyword;
}

// ========================================
// セラー管理機能
// ========================================

// セラータイプ定義
const SELLER_TYPES = {
  supplier: { label: '仕入れ先', color: '#4caf50', icon: '🛒' },
  rival: { label: 'ライバル', color: '#2196f3', icon: '🎯' },
  caution: { label: '要注意', color: '#f44336', icon: '⚠️' },
  other: { label: 'その他', color: '#9e9e9e', icon: '📌' }
};

// ストレージキー
const SELLER_STORAGE_KEYS = {
  VERSION: 'shiraberu_seller_data_version',
  CATEGORIES: 'shiraberu_categories',
  SELLERS: 'shiraberu_sellers',
  LAST_CATEGORY: 'shiraberu_last_category_id'
};

// 現在のスキーマバージョン
const SELLER_SCHEMA_VERSION = 1;

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
 * セラーデータの初期化
 */
async function initializeSellerData() {
  try {
    const data = await chrome.storage.local.get([
      SELLER_STORAGE_KEYS.VERSION,
      SELLER_STORAGE_KEYS.CATEGORIES,
      SELLER_STORAGE_KEYS.SELLERS
    ]);

    const currentVersion = data[SELLER_STORAGE_KEYS.VERSION] || 0;

    if (currentVersion === 0) {
      await chrome.storage.local.set({
        [SELLER_STORAGE_KEYS.VERSION]: SELLER_SCHEMA_VERSION,
        [SELLER_STORAGE_KEYS.CATEGORIES]: {},
        [SELLER_STORAGE_KEYS.SELLERS]: {},
        [SELLER_STORAGE_KEYS.LAST_CATEGORY]: null
      });
      console.log('[しらべる君 BG] セラーデータ初期化完了');
    }
  } catch (error) {
    console.error('[しらべる君 BG] セラーデータ初期化エラー:', error);
  }
}

/**
 * セラーIDを生成
 */
function generateSellerId(platform, platformId) {
  return `seller_${platform}_${platformId}`;
}

// セラー管理メッセージハンドラ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // セラー管理関連のアクション
  if (request.action === 'seller_getCategories') {
    chrome.storage.local.get(SELLER_STORAGE_KEYS.CATEGORIES, (data) => {
      const categories = data[SELLER_STORAGE_KEYS.CATEGORIES] || {};
      const result = Object.entries(categories)
        .map(([id, cat]) => ({ id, ...cat }))
        .sort((a, b) => a.order - b.order);
      sendResponse({ success: true, categories: result });
    });
    return true;
  }

  if (request.action === 'seller_addCategory') {
    (async () => {
      try {
        const data = await chrome.storage.local.get(SELLER_STORAGE_KEYS.CATEGORIES);
        const categories = data[SELLER_STORAGE_KEYS.CATEGORIES] || {};
        const id = generateId('cat');
        const maxOrder = Object.values(categories).reduce((max, cat) => Math.max(max, cat.order || 0), -1);

        categories[id] = {
          name: request.name.trim(),
          order: maxOrder + 1,
          createdAt: new Date().toISOString()
        };

        await chrome.storage.local.set({ [SELLER_STORAGE_KEYS.CATEGORIES]: categories });
        console.log('[しらべる君 BG] カテゴリ追加:', id, request.name);
        sendResponse({ success: true, id });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_updateCategory') {
    (async () => {
      try {
        const data = await chrome.storage.local.get(SELLER_STORAGE_KEYS.CATEGORIES);
        const categories = data[SELLER_STORAGE_KEYS.CATEGORIES] || {};

        if (!categories[request.id]) {
          throw new Error('カテゴリが見つかりません');
        }

        categories[request.id] = { ...categories[request.id], ...request.updates };
        await chrome.storage.local.set({ [SELLER_STORAGE_KEYS.CATEGORIES]: categories });
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_deleteCategory') {
    (async () => {
      try {
        const data = await chrome.storage.local.get([
          SELLER_STORAGE_KEYS.CATEGORIES,
          SELLER_STORAGE_KEYS.SELLERS
        ]);
        const categories = data[SELLER_STORAGE_KEYS.CATEGORIES] || {};
        const sellers = data[SELLER_STORAGE_KEYS.SELLERS] || {};

        // options.jsからはcategoryId、他の場所からはidで送られる可能性があるため両方対応
        const categoryId = request.categoryId || request.id;

        if (!categories[categoryId]) {
          throw new Error('カテゴリが見つかりません');
        }

        delete categories[categoryId];

        // セラーからこのカテゴリへの紐付けを解除
        for (const sellerId in sellers) {
          const seller = sellers[sellerId];
          if (seller.categoryIds && seller.categoryIds.includes(categoryId)) {
            seller.categoryIds = seller.categoryIds.filter(catId => catId !== categoryId);
          }
        }

        await chrome.storage.local.set({
          [SELLER_STORAGE_KEYS.CATEGORIES]: categories,
          [SELLER_STORAGE_KEYS.SELLERS]: sellers
        });
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_reorderCategories') {
    (async () => {
      try {
        const data = await chrome.storage.local.get(SELLER_STORAGE_KEYS.CATEGORIES);
        const categories = data[SELLER_STORAGE_KEYS.CATEGORIES] || {};

        request.orderedIds.forEach((id, index) => {
          if (categories[id]) {
            categories[id].order = index;
          }
        });

        await chrome.storage.local.set({ [SELLER_STORAGE_KEYS.CATEGORIES]: categories });
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_getSellers') {
    (async () => {
      try {
        const data = await chrome.storage.local.get(SELLER_STORAGE_KEYS.SELLERS);
        const sellers = data[SELLER_STORAGE_KEYS.SELLERS] || {};
        let result = Object.entries(sellers).map(([id, seller]) => ({ id, ...seller }));

        // フィルター適用
        if (request.filter?.categoryId) {
          result = result.filter(s => s.categoryIds && s.categoryIds.includes(request.filter.categoryId));
        }
        if (request.filter?.type) {
          result = result.filter(s => s.type === request.filter.type);
        }
        if (request.filter?.platform) {
          result = result.filter(s => s.platform === request.filter.platform);
        }

        // 日付でソート（新しい順）
        result.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        sendResponse({ success: true, sellers: result });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_checkSaved') {
    (async () => {
      try {
        const data = await chrome.storage.local.get(SELLER_STORAGE_KEYS.SELLERS);
        const sellers = data[SELLER_STORAGE_KEYS.SELLERS] || {};
        const sellerId = generateSellerId(request.platform, request.platformId);

        if (sellers[sellerId]) {
          sendResponse({ success: true, saved: true, seller: { id: sellerId, ...sellers[sellerId] } });
        } else {
          sendResponse({ success: true, saved: false });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_save') {
    (async () => {
      try {
        const data = await chrome.storage.local.get(SELLER_STORAGE_KEYS.SELLERS);
        const sellers = data[SELLER_STORAGE_KEYS.SELLERS] || {};
        const sellerId = generateSellerId(request.seller.platform, request.seller.platformId);

        if (sellers[sellerId]) {
          // 既存セラー → カテゴリを追加
          const existingCategoryIds = sellers[sellerId].categoryIds || [];
          const newCategoryIds = request.seller.categoryIds || [];
          const mergedCategoryIds = [...new Set([...existingCategoryIds, ...newCategoryIds])];

          sellers[sellerId] = {
            ...sellers[sellerId],
            categoryIds: mergedCategoryIds,
            type: request.seller.type || sellers[sellerId].type,
            memo: request.seller.memo !== undefined ? request.seller.memo : sellers[sellerId].memo
          };
          console.log('[しらべる君 BG] セラー更新（カテゴリ追加）:', sellerId);
        } else {
          // 新規セラー
          sellers[sellerId] = {
            platform: request.seller.platform,
            platformId: request.seller.platformId,
            name: request.seller.name,
            url: request.seller.url,
            categoryIds: request.seller.categoryIds || [],
            type: request.seller.type || 'other',
            memo: request.seller.memo || '',
            savedAt: new Date().toISOString()
          };
          console.log('[しらべる君 BG] セラー新規保存:', sellerId);
        }

        await chrome.storage.local.set({ [SELLER_STORAGE_KEYS.SELLERS]: sellers });

        // 最後に使用したカテゴリを記憶
        if (request.seller.categoryIds && request.seller.categoryIds.length > 0) {
          await chrome.storage.local.set({
            [SELLER_STORAGE_KEYS.LAST_CATEGORY]: request.seller.categoryIds[0]
          });
        }

        sendResponse({ success: true, sellerId });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_update') {
    (async () => {
      try {
        const data = await chrome.storage.local.get(SELLER_STORAGE_KEYS.SELLERS);
        const sellers = data[SELLER_STORAGE_KEYS.SELLERS] || {};

        if (!sellers[request.sellerId]) {
          throw new Error('セラーが見つかりません');
        }

        sellers[request.sellerId] = { ...sellers[request.sellerId], ...request.updates };
        await chrome.storage.local.set({ [SELLER_STORAGE_KEYS.SELLERS]: sellers });
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_delete') {
    (async () => {
      try {
        const data = await chrome.storage.local.get(SELLER_STORAGE_KEYS.SELLERS);
        const sellers = data[SELLER_STORAGE_KEYS.SELLERS] || {};

        if (!sellers[request.sellerId]) {
          throw new Error('セラーが見つかりません');
        }

        delete sellers[request.sellerId];
        await chrome.storage.local.set({ [SELLER_STORAGE_KEYS.SELLERS]: sellers });
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_getLastCategory') {
    chrome.storage.local.get(SELLER_STORAGE_KEYS.LAST_CATEGORY, (data) => {
      sendResponse({ success: true, categoryId: data[SELLER_STORAGE_KEYS.LAST_CATEGORY] || null });
    });
    return true;
  }

  if (request.action === 'seller_export') {
    (async () => {
      try {
        const data = await chrome.storage.local.get([
          SELLER_STORAGE_KEYS.CATEGORIES,
          SELLER_STORAGE_KEYS.SELLERS
        ]);

        const exportData = {
          version: SELLER_SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          categories: data[SELLER_STORAGE_KEYS.CATEGORIES] || {},
          sellers: data[SELLER_STORAGE_KEYS.SELLERS] || {}
        };

        if (request.format === 'csv') {
          // CSV形式
          const categories = exportData.categories;
          const sellers = exportData.sellers;
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

          sendResponse({ success: true, data: rows.join('\n'), format: 'csv' });
        } else {
          // JSON形式
          sendResponse({ success: true, data: JSON.stringify(exportData, null, 2), format: 'json' });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_import') {
    (async () => {
      try {
        const jsonData = JSON.parse(request.data);

        if (!jsonData.version || !jsonData.categories || !jsonData.sellers) {
          throw new Error('無効なデータ形式です');
        }

        if (jsonData.version > SELLER_SCHEMA_VERSION) {
          throw new Error('このデータは新しいバージョンで作成されています。拡張機能を更新してください。');
        }

        await chrome.storage.local.set({
          [SELLER_STORAGE_KEYS.VERSION]: SELLER_SCHEMA_VERSION,
          [SELLER_STORAGE_KEYS.CATEGORIES]: jsonData.categories,
          [SELLER_STORAGE_KEYS.SELLERS]: jsonData.sellers
        });

        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'seller_getStats') {
    (async () => {
      try {
        const data = await chrome.storage.local.get([
          SELLER_STORAGE_KEYS.CATEGORIES,
          SELLER_STORAGE_KEYS.SELLERS
        ]);

        const categories = data[SELLER_STORAGE_KEYS.CATEGORIES] || {};
        const sellers = data[SELLER_STORAGE_KEYS.SELLERS] || {};
        const sellerArray = Object.values(sellers);

        sendResponse({
          success: true,
          stats: {
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
          }
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

// 拡張機能インストール時の初期化
chrome.runtime.onInstalled.addListener(() => {
  initializeSellerData();
});

console.log('[しらべる君 BG] Background Service Worker 起動');
