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

console.log('[しらべる君 BG] Background Service Worker 起動');
