/**
 * しらべる君 - Options Page Script
 * 価格計算設定を含む全設定の管理
 */

// 有効なシークレットコード
const VALID_SECRET_CODES = ['MGOOSE2025'];

// デフォルト設定値
const DEFAULT_SETTINGS = {
  // 基本設定
  exchangeRate: 155,
  targetProfitRate: 20,
  feeRate: 18,
  adRate: 10,
  payoneerRate: 2,
  safetyMargin: 3,
  // 関税・通関設定
  tariffRate: 15,
  vatRate: 0,
  processingFeeRate: 2.1,
  mpf: 0,
  ceMpf: 296,
  mpfUsd: 0,
  euShippingDiff: 0,
  // 送料設定
  shippingMode: 'fixed',
  shippingCost: 3000,
  shippingThreshold: 5500,
  lowPriceMethod: 'EP',
  highPriceMethod: 'CF',
  actualWeight: 500,
  packageLength: 20,
  packageWidth: 20,
  packageHeight: 20,
  shippingMethod: '自動選択',
  // サーチャージ・割引設定
  fedexFuelSurcharge: 29.75,
  dhlFuelSurcharge: 30,
  cpassDiscount: 3,
  fedexExtraPer500g: 115,
  dhlExtraPer500g: 96
};

// 送料テーブル（2026年データ - price-calculator.jsと同期）
const SHIPPING_RATE_TABLE = {
  EP: [ // eパケット
    { min: 1, max: 100, yen: 1200 }, { min: 101, max: 200, yen: 1410 }, { min: 201, max: 300, yen: 1620 },
    { min: 301, max: 400, yen: 1830 }, { min: 401, max: 500, yen: 2040 }, { min: 501, max: 600, yen: 2250 },
    { min: 601, max: 700, yen: 2460 }, { min: 701, max: 800, yen: 2670 }, { min: 801, max: 900, yen: 2880 },
    { min: 901, max: 1000, yen: 3090 }, { min: 1001, max: 1100, yen: 3300 }, { min: 1101, max: 1200, yen: 3510 },
    { min: 1201, max: 1300, yen: 3720 }, { min: 1301, max: 1400, yen: 3930 }, { min: 1401, max: 1500, yen: 4140 },
    { min: 1501, max: 1600, yen: 4350 }, { min: 1601, max: 1700, yen: 4560 }, { min: 1701, max: 1800, yen: 4770 },
    { min: 1801, max: 1900, yen: 4980 }, { min: 1901, max: 2000, yen: 5190 }
  ],
  CF: [ // Cpass-FedEx (2026年 FedEx FICP USW)
    { min: 1, max: 500, yen: 2115 }, { min: 501, max: 1000, yen: 2599 }, { min: 1001, max: 1500, yen: 2840 },
    { min: 1501, max: 2000, yen: 3108 }, { min: 2001, max: 2500, yen: 3383 }, { min: 2501, max: 3000, yen: 3540 },
    { min: 3001, max: 3500, yen: 3593 }, { min: 3501, max: 4000, yen: 4022 }, { min: 4001, max: 4500, yen: 4451 },
    { min: 4501, max: 5000, yen: 4718 }, { min: 5001, max: 5500, yen: 5043 }, { min: 5501, max: 6000, yen: 5366 },
    { min: 6001, max: 6500, yen: 5735 }, { min: 6501, max: 7000, yen: 6184 }, { min: 7001, max: 7500, yen: 6683 },
    { min: 7501, max: 8000, yen: 6871 }, { min: 8001, max: 8500, yen: 7060 }, { min: 8501, max: 9000, yen: 7249 },
    { min: 9001, max: 9500, yen: 8865 }, { min: 9501, max: 10000, yen: 9089 },
    { min: 10001, max: 10500, yen: 9346 }, { min: 10501, max: 11000, yen: 9602 }, { min: 11001, max: 11500, yen: 9861 },
    { min: 11501, max: 12000, yen: 10116 }, { min: 12001, max: 12500, yen: 11439 }, { min: 12501, max: 13000, yen: 11723 },
    { min: 13001, max: 13500, yen: 12006 }, { min: 13501, max: 14000, yen: 12289 }, { min: 14001, max: 14500, yen: 12573 },
    { min: 14501, max: 15000, yen: 12857 }, { min: 15001, max: 15500, yen: 13140 }, { min: 15501, max: 16000, yen: 14631 },
    { min: 16001, max: 16500, yen: 14940 }, { min: 16501, max: 17000, yen: 15249 }, { min: 17001, max: 17500, yen: 15559 },
    { min: 17501, max: 18000, yen: 15867 }, { min: 18001, max: 18500, yen: 16177 }, { min: 18501, max: 19000, yen: 16485 },
    { min: 19001, max: 19500, yen: 16794 }, { min: 19501, max: 20000, yen: 17104 },
    { min: 20001, max: 21000, yen: 20625 }, { min: 21001, max: 22000, yen: 21657 }, { min: 22001, max: 23000, yen: 22689 },
    { min: 23001, max: 24000, yen: 23721 }, { min: 24001, max: 25000, yen: 24754 }, { min: 25001, max: 26000, yen: 25787 },
    { min: 26001, max: 27000, yen: 26819 }, { min: 27001, max: 28000, yen: 27852 }, { min: 28001, max: 29000, yen: 28885 },
    { min: 29001, max: 30000, yen: 29916 }, { min: 30001, max: Infinity, yen: 64872 }
  ],
  CD: [ // Cpass-DHL (2026年 DHL Zone10 US)
    { min: 1, max: 500, yen: 2454 }, { min: 501, max: 1000, yen: 2780 }, { min: 1001, max: 1500, yen: 3106 },
    { min: 1501, max: 2000, yen: 3432 }, { min: 2001, max: 2500, yen: 3758 }, { min: 2501, max: 3000, yen: 4084 },
    { min: 3001, max: 3500, yen: 4410 }, { min: 3501, max: 4000, yen: 4736 }, { min: 4001, max: 4500, yen: 5062 },
    { min: 4501, max: 5000, yen: 5388 }, { min: 5001, max: 5500, yen: 5714 }, { min: 5501, max: 6000, yen: 6040 },
    { min: 6001, max: 6500, yen: 6366 }, { min: 6501, max: 7000, yen: 6692 }, { min: 7001, max: 7500, yen: 7018 },
    { min: 7501, max: 8000, yen: 7344 }, { min: 8001, max: 8500, yen: 7670 }, { min: 8501, max: 9000, yen: 7996 },
    { min: 9001, max: 9500, yen: 8322 }, { min: 9501, max: 10000, yen: 8648 },
    { min: 10001, max: 10500, yen: 8974 }, { min: 10501, max: 11000, yen: 9300 }, { min: 11001, max: 11500, yen: 9626 },
    { min: 11501, max: 12000, yen: 9952 }, { min: 12001, max: 12500, yen: 10278 }, { min: 12501, max: 13000, yen: 10604 },
    { min: 13001, max: 13500, yen: 10930 }, { min: 13501, max: 14000, yen: 11256 }, { min: 14001, max: 14500, yen: 11582 },
    { min: 14501, max: 15000, yen: 11908 }, { min: 15001, max: 15500, yen: 12234 }, { min: 15501, max: 16000, yen: 12560 },
    { min: 16001, max: 16500, yen: 12886 }, { min: 16501, max: 17000, yen: 13212 }, { min: 17001, max: 17500, yen: 13538 },
    { min: 17501, max: 18000, yen: 13864 }, { min: 18001, max: 18500, yen: 14190 }, { min: 18501, max: 19000, yen: 14516 },
    { min: 19001, max: 19500, yen: 14842 }, { min: 19501, max: 20000, yen: 15168 },
    { min: 20001, max: 21000, yen: 15820 }, { min: 21001, max: 22000, yen: 16472 }, { min: 22001, max: 23000, yen: 17124 },
    { min: 23001, max: 24000, yen: 17776 }, { min: 24001, max: 25000, yen: 18428 }, { min: 25001, max: 26000, yen: 19080 },
    { min: 26001, max: 27000, yen: 19732 }, { min: 27001, max: 28000, yen: 20384 }, { min: 28001, max: 29000, yen: 21036 },
    { min: 29001, max: 30000, yen: 21688 }, { min: 30001, max: Infinity, yen: 46464 }
  ],
  EL: [ // eLogistics
    { min: 1, max: 1000, yen: 3700 }, { min: 1001, max: 1500, yen: 3900 }, { min: 1501, max: 2000, yen: 4100 },
    { min: 2001, max: 2500, yen: 4300 }, { min: 2501, max: 3000, yen: 5600 }, { min: 3001, max: 3500, yen: 5900 },
    { min: 3501, max: 4000, yen: 6300 }, { min: 4001, max: 4500, yen: 6600 }, { min: 4501, max: 5000, yen: 7200 },
    { min: 5001, max: 5500, yen: 7900 }, { min: 5501, max: 6000, yen: 8700 }, { min: 6001, max: 6500, yen: 10300 },
    { min: 6501, max: 7000, yen: 12200 }, { min: 7001, max: 7500, yen: 14100 }, { min: 7501, max: 8000, yen: 16000 },
    { min: 8001, max: 8500, yen: 17900 }, { min: 8501, max: 9000, yen: 19800 }, { min: 9001, max: 9500, yen: 21800 },
    { min: 9501, max: 10000, yen: 23700 }, { min: 10001, max: 30000, yen: 47200 }
  ],
  CE: [ // Cpass-Economy
    { min: 1, max: 100, yen: 1227 }, { min: 101, max: 200, yen: 1367 }, { min: 201, max: 300, yen: 1581 },
    { min: 301, max: 400, yen: 1778 }, { min: 401, max: 500, yen: 2060 }, { min: 501, max: 600, yen: 2222 },
    { min: 601, max: 700, yen: 2321 }, { min: 701, max: 800, yen: 2703 }, { min: 801, max: 900, yen: 2820 },
    { min: 901, max: 1000, yen: 3020 }, { min: 1001, max: 1100, yen: 3136 }, { min: 1101, max: 1200, yen: 3250 },
    { min: 1201, max: 1300, yen: 3366 }, { min: 1301, max: 1400, yen: 3704 }, { min: 1401, max: 1500, yen: 3816 },
    { min: 1501, max: 1600, yen: 3935 }, { min: 1601, max: 1700, yen: 4046 }, { min: 1701, max: 1800, yen: 4165 },
    { min: 1801, max: 1900, yen: 5056 }, { min: 1901, max: 2000, yen: 5245 }, { min: 2001, max: 2500, yen: 5582 },
    { min: 2501, max: 3000, yen: 6333 }, { min: 3001, max: 3500, yen: 6958 }, { min: 3501, max: 4000, yen: 7704 },
    { min: 4001, max: 4500, yen: 9135 }, { min: 4501, max: 5000, yen: 11733 }, { min: 5001, max: 25000, yen: 40955 }
  ],
  EMS: [ // EMS
    { min: 1, max: 500, yen: 3900 }, { min: 501, max: 600, yen: 4180 }, { min: 601, max: 700, yen: 4460 },
    { min: 701, max: 800, yen: 4740 }, { min: 801, max: 900, yen: 5020 }, { min: 901, max: 1000, yen: 5300 },
    { min: 1001, max: 1250, yen: 5990 }, { min: 1251, max: 1500, yen: 6600 }, { min: 1501, max: 1750, yen: 7290 },
    { min: 1751, max: 2000, yen: 7900 }, { min: 2001, max: 2500, yen: 9100 }, { min: 2501, max: 3000, yen: 10300 },
    { min: 3001, max: 3500, yen: 11500 }, { min: 3501, max: 4000, yen: 12700 }, { min: 4001, max: 4500, yen: 13900 },
    { min: 4501, max: 5000, yen: 15100 }, { min: 5001, max: 30000, yen: 75100 }
  ]
};


// セラータイプ定義（seller-manager.jsと同期）
const SELLER_TYPES = {
  supplier: { label: '仕入れ先', color: '#4caf50', icon: '🛒' },
  rival: { label: 'ライバル', color: '#2196f3', icon: '🎯' },
  caution: { label: '要注意', color: '#f44336', icon: '⚠️' },
  other: { label: 'その他', color: '#9e9e9e', icon: '📌' }
};

// プラットフォームアイコン
const PLATFORM_ICONS = {
  mercari: '🏪',
  ebay: '🌐'
};

// 現在のフィルター状態
let currentFilters = {
  categoryId: '',
  type: ''
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('しらべる君: 設定画面の初期化開始');
  try {
    // イベントリスナーを設定（最初に設定）
    console.log('イベントリスナー設定中...');
    setupEventListeners();

    // タブ切り替えイベントを設定
    console.log('タブイベント設定中...');
    setupTabEventListeners();

    // 保存済みの設定を読み込み
    console.log('設定読み込み中...');
    await loadAllSettings();

    // 送料モード切替
    console.log('送料モード切替中...');
    toggleShippingMode();

    // 容積重量計算のイベントを設定
    console.log('容積重量リスナー設定中...');
    setupVolumetricWeightListeners();

    // セラー管理イベントを設定
    console.log('セラー管理イベント設定中...');
    setupSellerEventListeners();

    console.log('しらべる君: 設定画面の初期化完了');
  } catch (error) {
    console.error('設定の初期化エラー:', error);
  }
});

/**
 * 全設定を読み込み
 */
async function loadAllSettings() {
  try {
    // sync storageからAPIキーと価格設定を読み込み
    const syncResult = await chrome.storage.sync.get(['openaiApiKey', 'priceCalcSettings']);

    // local storageからシークレットコードを読み込み
    const localResult = await chrome.storage.local.get(['shiraberu_secret_code']);

    // シークレットコード
    const secretCode = localResult.shiraberu_secret_code || '';
    const secretCodeEl = document.getElementById('secretCode');
    if (secretCodeEl) {
      secretCodeEl.value = secretCode;
    }
    updatePremiumStatus(secretCode);

    // APIキー
    const apiKey = syncResult.openaiApiKey || '';
    const apiKeyEl = document.getElementById('openaiKey');
    if (apiKeyEl) {
      apiKeyEl.value = apiKey;
    }
    updateApiKeyStatus(!!apiKey);

    // 価格計算設定
    const settings = syncResult.priceCalcSettings || DEFAULT_SETTINGS;
    applySettingsToForm(settings);
  } catch (error) {
    console.error('設定読み込みエラー:', error);
  }
}

/**
 * 設定をフォームに適用
 */
function applySettingsToForm(settings) {
  const fields = [
    'exchangeRate', 'targetProfitRate', 'feeRate', 'adRate', 'payoneerRate', 'safetyMargin',
    'tariffRate', 'vatRate', 'processingFeeRate', 'mpf', 'ceMpf', 'mpfUsd', 'euShippingDiff',
    'shippingMode', 'shippingCost', 'shippingThreshold', 'lowPriceMethod', 'highPriceMethod',
    'actualWeight', 'packageLength', 'packageWidth', 'packageHeight', 'shippingMethod',
    'fedexFuelSurcharge', 'dhlFuelSurcharge', 'cpassDiscount', 'fedexExtraPer500g', 'dhlExtraPer500g'
  ];

  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el && settings[field] !== undefined) {
      el.value = settings[field];
    }
  });

  // 送料モード切替
  toggleShippingMode();

  // 容積重量を計算
  calculateVolumetricWeight();
}

/**
 * 要素から値を安全に取得するヘルパー関数
 * 注意: 0も有効な値として扱うため、|| ではなく明示的なチェックを使用
 */
function getElementValue(id, defaultValue, isNumber = true) {
  const el = document.getElementById(id);
  if (!el) return defaultValue;
  if (isNumber) {
    const parsed = parseFloat(el.value);
    // NaNの場合のみデフォルト値を返す（0は有効な値として扱う）
    return isNaN(parsed) ? defaultValue : parsed;
  }
  // 文字列の場合：空文字のみデフォルト値を返す
  return el.value !== '' ? el.value : defaultValue;
}

/**
 * フォームから設定を取得
 */
function getSettingsFromForm() {
  return {
    exchangeRate: getElementValue('exchangeRate', DEFAULT_SETTINGS.exchangeRate),
    targetProfitRate: getElementValue('targetProfitRate', DEFAULT_SETTINGS.targetProfitRate),
    feeRate: getElementValue('feeRate', DEFAULT_SETTINGS.feeRate),
    adRate: getElementValue('adRate', DEFAULT_SETTINGS.adRate),
    payoneerRate: getElementValue('payoneerRate', DEFAULT_SETTINGS.payoneerRate),
    safetyMargin: getElementValue('safetyMargin', DEFAULT_SETTINGS.safetyMargin),
    tariffRate: getElementValue('tariffRate', DEFAULT_SETTINGS.tariffRate),
    vatRate: getElementValue('vatRate', DEFAULT_SETTINGS.vatRate),
    processingFeeRate: getElementValue('processingFeeRate', DEFAULT_SETTINGS.processingFeeRate),
    mpf: getElementValue('mpf', 0),
    ceMpf: getElementValue('ceMpf', DEFAULT_SETTINGS.ceMpf),
    mpfUsd: getElementValue('mpfUsd', 0),
    euShippingDiff: getElementValue('euShippingDiff', 0),
    shippingMode: getElementValue('shippingMode', DEFAULT_SETTINGS.shippingMode, false),
    shippingCost: getElementValue('shippingCost', DEFAULT_SETTINGS.shippingCost),
    shippingThreshold: getElementValue('shippingThreshold', DEFAULT_SETTINGS.shippingThreshold),
    lowPriceMethod: getElementValue('lowPriceMethod', DEFAULT_SETTINGS.lowPriceMethod, false),
    highPriceMethod: getElementValue('highPriceMethod', DEFAULT_SETTINGS.highPriceMethod, false),
    actualWeight: getElementValue('actualWeight', DEFAULT_SETTINGS.actualWeight),
    packageLength: getElementValue('packageLength', DEFAULT_SETTINGS.packageLength),
    packageWidth: getElementValue('packageWidth', DEFAULT_SETTINGS.packageWidth),
    packageHeight: getElementValue('packageHeight', DEFAULT_SETTINGS.packageHeight),
    shippingMethod: getElementValue('shippingMethod', DEFAULT_SETTINGS.shippingMethod, false),
    // サーチャージ・割引設定
    fedexFuelSurcharge: getElementValue('fedexFuelSurcharge', DEFAULT_SETTINGS.fedexFuelSurcharge),
    dhlFuelSurcharge: getElementValue('dhlFuelSurcharge', DEFAULT_SETTINGS.dhlFuelSurcharge),
    cpassDiscount: getElementValue('cpassDiscount', DEFAULT_SETTINGS.cpassDiscount),
    fedexExtraPer500g: getElementValue('fedexExtraPer500g', DEFAULT_SETTINGS.fedexExtraPer500g),
    dhlExtraPer500g: getElementValue('dhlExtraPer500g', DEFAULT_SETTINGS.dhlExtraPer500g)
  };
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // シークレットコード表示切り替え
  const toggleSecretBtn = document.getElementById('toggleSecretVisibility');
  if (toggleSecretBtn) {
    toggleSecretBtn.addEventListener('click', () => {
      const input = document.getElementById('secretCode');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          toggleSecretBtn.textContent = '🙈';
        } else {
          input.type = 'password';
          toggleSecretBtn.textContent = '👁';
        }
      }
    });
  }

  // シークレットコード入力時のリアルタイム検証
  const secretCodeInput = document.getElementById('secretCode');
  if (secretCodeInput) {
    secretCodeInput.addEventListener('input', (e) => {
      updatePremiumStatus(e.target.value);
    });
  }

  // APIキーパスワード表示切り替え
  const toggleVisibilityBtn = document.getElementById('toggleVisibility');
  if (toggleVisibilityBtn) {
    toggleVisibilityBtn.addEventListener('click', () => {
      const input = document.getElementById('openaiKey');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          toggleVisibilityBtn.textContent = '🙈';
        } else {
          input.type = 'password';
          toggleVisibilityBtn.textContent = '👁';
        }
      }
    });
  }

  // 保存ボタン
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAllSettings);
  }

  // リセットボタン
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetToDefaults);
  }

  // 送料モード変更
  const shippingModeSelect = document.getElementById('shippingMode');
  if (shippingModeSelect) {
    shippingModeSelect.addEventListener('change', toggleShippingMode);
  }

  // 為替レート更新ボタン
  const refreshRateBtn = document.getElementById('refreshRateBtn');
  if (refreshRateBtn) {
    refreshRateBtn.addEventListener('click', refreshExchangeRate);
  }

  // セクション折りたたみ（全てのセクションヘッダー）
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });
}

/**
 * 容積重量計算用のイベントリスナー
 */
function setupVolumetricWeightListeners() {
  const fields = ['actualWeight', 'packageLength', 'packageWidth', 'packageHeight', 'shippingMethod'];
  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el) {
      el.addEventListener('input', () => {
        calculateVolumetricWeight();
        calculateEstimatedShipping();
      });
      el.addEventListener('change', () => {
        calculateVolumetricWeight();
        calculateEstimatedShipping();
      });
    }
  });

  // サーチャージ・割引設定のイベントリスナー
  const surchargeFields = ['fedexFuelSurcharge', 'dhlFuelSurcharge', 'cpassDiscount', 'fedexExtraPer500g', 'dhlExtraPer500g'];
  surchargeFields.forEach(field => {
    const el = document.getElementById(field);
    if (el) {
      el.addEventListener('input', calculateEstimatedShipping);
      el.addEventListener('change', calculateEstimatedShipping);
    }
  });
}

/**
 * 全設定を保存
 */
async function saveAllSettings() {
  try {
    const secretCodeEl = document.getElementById('secretCode');
    const apiKeyEl = document.getElementById('openaiKey');

    const secretCode = secretCodeEl ? secretCodeEl.value.trim() : '';
    const apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';

    // シークレットコードの検証（空でない場合のみ）
    const isValidCode = secretCode === '' || VALID_SECRET_CODES.includes(secretCode.toUpperCase());
    if (secretCode && !isValidCode) {
      showToast('無効なシークレットコードです', 'error');
      return;
    }

    // APIキーのバリデーション（空でない場合）
    if (apiKey && !apiKey.startsWith('sk-')) {
      showToast('無効なAPIキー形式です（sk-で始まる必要があります）', 'error');
      return;
    }

    // 価格計算設定を取得
    const priceCalcSettings = getSettingsFromForm();

    // sync storageに保存（APIキー、価格設定）
    await chrome.storage.sync.set({
      openaiApiKey: apiKey,
      priceCalcSettings: priceCalcSettings
    });

    // local storageに保存（シークレットコード）
    await chrome.storage.local.set({
      shiraberu_secret_code: secretCode.toUpperCase()
    });

    showToast('すべての設定を保存しました', 'success');
    updatePremiumStatus(secretCode);
    updateApiKeyStatus(!!apiKey);

    // 保存ステータス表示
    const statusEl = document.getElementById('saveStatus');
    if (statusEl) {
      statusEl.className = 'status status-success';
      statusEl.innerHTML = '✅ 設定が保存されました';
      setTimeout(() => {
        statusEl.innerHTML = '';
        statusEl.className = '';
      }, 3000);
    }
  } catch (error) {
    console.error('保存エラー:', error);
    showToast('保存中にエラーが発生しました', 'error');
  }
}

/**
 * デフォルト値にリセット
 */
async function resetToDefaults() {
  if (!confirm('すべての価格計算設定を初期値に戻しますか？\n（APIキーはリセットされません）')) {
    return;
  }

  applySettingsToForm(DEFAULT_SETTINGS);
  showToast('設定を初期値に戻しました', 'success');
}

/**
 * 送料モード切替
 */
function toggleShippingMode() {
  const mode = document.getElementById('shippingMode').value;
  const fixedSettings = document.getElementById('fixedShippingSettings');
  const tableSettings = document.getElementById('tableShippingSettings');

  if (mode === 'fixed') {
    fixedSettings.classList.remove('hidden');
    tableSettings.classList.add('hidden');
  } else {
    fixedSettings.classList.add('hidden');
    tableSettings.classList.remove('hidden');
    calculateVolumetricWeight();
    calculateEstimatedShipping();
  }
}

/**
 * 容積重量を計算
 */
function calculateVolumetricWeight() {
  const length = parseFloat(document.getElementById('packageLength').value) || 0;
  const width = parseFloat(document.getElementById('packageWidth').value) || 0;
  const height = parseFloat(document.getElementById('packageHeight').value) || 0;

  const volume = length * width * height;

  // CF/CD/EL/EMS用（÷5）
  const volWeight5 = Math.max(Math.round(volume / 5), 100);
  // CE用（÷8）
  const volWeight8 = Math.max(Math.round(volume / 8), 100);

  document.getElementById('volumetricWeight').value = volWeight5;
  document.getElementById('volumetricWeightCE').value = volWeight8;
}

/**
 * 送料試算を計算
 */
function calculateEstimatedShipping() {
  const actualWeight = parseFloat(document.getElementById('actualWeight').value) || 0;
  const volWeight5 = parseFloat(document.getElementById('volumetricWeight').value) || 0;
  const volWeight8 = parseFloat(document.getElementById('volumetricWeightCE').value) || 0;
  const selectedMethod = document.getElementById('shippingMethod').value;

  const allMethods = [
    { code: 'EP', name: 'eパケット', volWeight: 0 },
    { code: 'CE', name: 'Cpass-Economy', volWeight: volWeight8 },
    { code: 'CF', name: 'Cpass-FedEx', volWeight: volWeight5 },
    { code: 'CD', name: 'Cpass-DHL', volWeight: volWeight5 },
    { code: 'EL', name: 'eLogistics', volWeight: volWeight5 },
    { code: 'EMS', name: 'EMS', volWeight: 0 }
  ];

  // 自動選択の場合の判定
  let autoSelectedCode = null;
  if (selectedMethod === '自動選択') {
    const lowMethod = document.getElementById('lowPriceMethod').value;
    const highMethod = document.getElementById('highPriceMethod').value;
    autoSelectedCode = (lowMethod === 'EP' && actualWeight > 2000) ? highMethod : lowMethod;
  }

  let tableHtml = '';
  allMethods.forEach(m => {
    let chargeableWeight;
    if (m.code === 'EP' || m.code === 'EMS') {
      chargeableWeight = actualWeight;
    } else {
      chargeableWeight = Math.max(actualWeight, m.volWeight);
    }

    const cost = calculateSpecificMethodRate(m.code, actualWeight, chargeableWeight);
    const isUnavailable = (cost === null || cost === undefined || cost === 999999);

    let isSelected = false;
    if (selectedMethod === '自動選択') {
      isSelected = (m.code === autoSelectedCode);
    } else {
      isSelected = (m.code === selectedMethod);
    }

    let rowClass = '';
    if (isSelected) rowClass = 'selected';
    else if (isUnavailable) rowClass = 'unavailable';

    let costDisplay = isUnavailable ? '対応不可' : `¥${cost.toLocaleString()}`;

    tableHtml += `<tr class="${rowClass}">
      <td>${m.name}</td>
      <td>${chargeableWeight.toLocaleString()} g</td>
      <td class="cost-cell">${costDisplay}</td>
    </tr>`;
  });

  document.getElementById('shippingEstimateBody').innerHTML = tableHtml;
}

/**
 * 配送方法別の料金計算
 */
function calculateSpecificMethodRate(method, actualWeight, chargeableWeight) {
  switch (method) {
    case 'EP':
      return getEpacketRate(actualWeight);
    case 'CF':
      return getCpassFedexRate(chargeableWeight);
    case 'CD':
      return getCpassDHLRate(chargeableWeight);
    case 'EL':
      return getElogiRate(chargeableWeight);
    case 'CE':
      return getCpassEconomyRate(chargeableWeight);
    case 'EMS':
      return getEMSRate(actualWeight);
    default:
      return getCpassFedexRate(chargeableWeight);
  }
}

/**
 * eパケット料金
 */
function getEpacketRate(weight) {
  if (weight > 2000) return null;
  for (const rate of SHIPPING_RATE_TABLE.EP) {
    if (weight >= rate.min && weight <= rate.max) {
      return rate.yen;
    }
  }
  return null;
}

/**
 * Cpass-FedEx料金
 */
function getCpassFedexRate(weight) {
  // フォームから設定を取得
  const fedexFuelSurcharge = parseFloat(document.getElementById('fedexFuelSurcharge')?.value) || DEFAULT_SETTINGS.fedexFuelSurcharge;
  const cpassDiscount = parseFloat(document.getElementById('cpassDiscount')?.value) || DEFAULT_SETTINGS.cpassDiscount;
  const fedexExtraPer500g = parseFloat(document.getElementById('fedexExtraPer500g')?.value) || DEFAULT_SETTINGS.fedexExtraPer500g;

  const rounded = Math.ceil(weight / 500) * 500;
  let base = null;

  for (const rate of SHIPPING_RATE_TABLE.CF) {
    if (weight >= rate.min && weight <= rate.max) {
      base = rate.yen;
      break;
    }
  }

  if (!base) return 999999;

  // 500gごとの追加料金
  const overUnits = Math.max(0, (rounded - 500) / 500);
  const extra = overUnits * fedexExtraPer500g;
  const subTotal = base + extra;
  // 燃油サーチャージ
  const fuel = subTotal * (fedexFuelSurcharge / 100);
  // Cpass割引
  const discount = -(subTotal + fuel) * (cpassDiscount / 100);
  return Math.round(subTotal + fuel + discount);
}

/**
 * Cpass-DHL料金
 */
function getCpassDHLRate(weight) {
  // フォームから設定を取得
  const dhlFuelSurcharge = parseFloat(document.getElementById('dhlFuelSurcharge')?.value) || DEFAULT_SETTINGS.dhlFuelSurcharge;
  const cpassDiscount = parseFloat(document.getElementById('cpassDiscount')?.value) || DEFAULT_SETTINGS.cpassDiscount;
  const dhlExtraPer500g = parseFloat(document.getElementById('dhlExtraPer500g')?.value) || DEFAULT_SETTINGS.dhlExtraPer500g;

  const rounded = Math.ceil(weight / 500) * 500;
  let base = null;

  for (const rate of SHIPPING_RATE_TABLE.CD) {
    if (weight >= rate.min && weight <= rate.max) {
      base = rate.yen;
      break;
    }
  }

  if (!base) return 999999;

  // 500gごとの追加料金
  const overUnits = Math.max(0, (rounded - 500) / 500);
  const extra = overUnits * dhlExtraPer500g;
  const subTotal = base + extra;
  // 燃油サーチャージ
  const fuel = subTotal * (dhlFuelSurcharge / 100);
  // Cpass割引
  const discount = -(subTotal + fuel) * (cpassDiscount / 100);
  return Math.round(subTotal + fuel + discount);
}

/**
 * eLogistics料金
 */
function getElogiRate(weight) {
  for (const rate of SHIPPING_RATE_TABLE.EL) {
    if (weight >= rate.min && weight <= rate.max) {
      return rate.yen;
    }
  }
  return 999999;
}

/**
 * Cpass-Economy料金
 */
function getCpassEconomyRate(weight) {
  for (const rate of SHIPPING_RATE_TABLE.CE) {
    if (weight >= rate.min && weight <= rate.max) {
      return rate.yen !== null ? rate.yen : 999999;
    }
  }
  return 999999;
}

/**
 * EMS料金
 */
function getEMSRate(weight) {
  for (const rate of SHIPPING_RATE_TABLE.EMS) {
    if (weight >= rate.min && weight <= rate.max) {
      return rate.yen;
    }
  }
  return 999999;
}

/**
 * 為替レートを更新
 */
async function refreshExchangeRate() {
  const btn = document.getElementById('refreshRateBtn');
  btn.classList.add('loading');
  btn.textContent = '取得中...';

  try {
    // 無料の為替API（exchangerate-api）を使用
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();

    if (data && data.rates && data.rates.JPY) {
      const rate = data.rates.JPY;
      document.getElementById('exchangeRate').value = rate.toFixed(3);
      showToast(`為替レートを更新しました: $1 = ¥${rate.toFixed(2)}`, 'success');
    } else {
      throw new Error('レート取得失敗');
    }
  } catch (error) {
    console.error('為替レート取得エラー:', error);
    showToast('為替レートの取得に失敗しました', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = '🔄 更新';
  }
}

/**
 * セクションの折りたたみ切替
 */
function toggleSection(header) {
  const section = header.parentElement;
  section.classList.toggle('collapsed');
}

/**
 * プレミアムステータス表示を更新
 */
function updatePremiumStatus(code) {
  const statusEl = document.getElementById('premiumStatus');
  if (!statusEl) return;

  const isValid = code && VALID_SECRET_CODES.includes(code.trim().toUpperCase());

  if (isValid) {
    statusEl.className = 'status status-success';
    statusEl.innerHTML = '✅ プレミアム機能が有効です（価格分析・価格計算が利用可能）';
  } else if (code && code.trim() !== '') {
    statusEl.className = 'status status-error';
    statusEl.innerHTML = '❌ 無効なシークレットコードです';
  } else {
    statusEl.className = 'status status-warning';
    statusEl.innerHTML = '⚠️ 無料版です（eBay検索・Terapeak検索・AI翻訳のみ利用可能）';
  }
}

/**
 * APIキーステータス表示を更新
 */
function updateApiKeyStatus(hasKey) {
  const statusEl = document.getElementById('apiKeyStatus');
  if (!statusEl) return;

  if (hasKey) {
    statusEl.className = 'status status-success';
    statusEl.innerHTML = '✅ APIキーが設定されています';
  } else {
    statusEl.className = 'status status-warning';
    statusEl.innerHTML = '⚠️ APIキーが設定されていません（AI翻訳機能は使用できません）';
  }
}

/**
 * トースト通知を表示
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// グローバル関数として公開（HTMLのonclickから呼び出し用）
window.toggleShippingMode = toggleShippingMode;
window.refreshExchangeRate = refreshExchangeRate;
window.toggleSection = toggleSection;

// ========================================
// タブ切り替え機能
// ========================================

/**
 * タブ切り替えイベントリスナーを設定
 */
function setupTabEventListeners() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
}

/**
 * タブを切り替え
 */
function switchTab(tabName) {
  // ボタンのアクティブ状態を切り替え
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // タブコンテンツの表示/非表示
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });

  // セラータブに切り替えた場合、データを読み込む
  if (tabName === 'sellers') {
    checkPremiumAndLoadSellers();
  }
}

// ========================================
// セラー管理機能
// ========================================

/**
 * セラー管理イベントリスナーを設定
 */
function setupSellerEventListeners() {
  // カテゴリフィルター
  const categoryFilter = document.getElementById('sellerCategoryFilter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentFilters.categoryId = e.target.value;
      loadSellerList();
    });
  }

  // タイプフィルター
  document.querySelectorAll('.seller-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seller-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.type = btn.dataset.type;
      loadSellerList();
    });
  });

  // カテゴリ追加ボタン
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', addNewCategory);
  }

  // カテゴリ管理ボタン
  const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
  if (manageCategoriesBtn) {
    manageCategoriesBtn.addEventListener('click', openCategoryManager);
  }

  // JSONエクスポートボタン
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportAsJson);
  }

  // CSVエクスポートボタン
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportAsCsv);
  }

  // モーダル関連
  const closeEditModalBtn = document.getElementById('closeEditModal');
  if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener('click', closeEditModal);
  }

  const cancelEditModalBtn = document.getElementById('cancelEditModal');
  if (cancelEditModalBtn) {
    cancelEditModalBtn.addEventListener('click', closeEditModal);
  }

  const saveEditModalBtn = document.getElementById('saveEditModal');
  if (saveEditModalBtn) {
    saveEditModalBtn.addEventListener('click', saveEditSeller);
  }

  // モーダル外クリックで閉じる
  const editSellerModal = document.getElementById('editSellerModal');
  if (editSellerModal) {
    editSellerModal.addEventListener('click', (e) => {
      if (e.target === editSellerModal) {
        closeEditModal();
      }
    });
  }

  // モーダル内カテゴリ追加ボタン
  const modalAddCategoryBtn = document.getElementById('modalAddCategoryBtn');
  if (modalAddCategoryBtn) {
    modalAddCategoryBtn.addEventListener('click', addCategoryInModal);
  }
}

/**
 * プレミアム状態を確認してセラーを読み込む
 */
async function checkPremiumAndLoadSellers() {
  const localResult = await chrome.storage.local.get(['shiraberu_secret_code']);
  const secretCode = localResult.shiraberu_secret_code || '';
  const isPremium = VALID_SECRET_CODES.includes(secretCode.toUpperCase());

  const premiumRequired = document.getElementById('sellerPremiumRequired');
  const sellerManagement = document.getElementById('sellerManagement');

  if (isPremium) {
    premiumRequired.classList.add('hidden');
    sellerManagement.classList.remove('hidden');
    await loadSellerStats();
    await loadCategoryOptions();
    await loadSellerList();
  } else {
    premiumRequired.classList.remove('hidden');
    sellerManagement.classList.add('hidden');
  }
}

/**
 * セラー統計を読み込む
 */
async function loadSellerStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'seller_getStats' });
    if (response && response.success) {
      const stats = response.stats;
      document.getElementById('statTotalSellers').textContent = stats.totalSellers;
      document.getElementById('statMercari').textContent = stats.byPlatform.mercari;
      document.getElementById('statEbay').textContent = stats.byPlatform.ebay;
      document.getElementById('statCategories').textContent = stats.totalCategories;
    }
  } catch (error) {
    console.error('統計読み込みエラー:', error);
  }
}

/**
 * カテゴリ選択肢を読み込む
 */
async function loadCategoryOptions() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'seller_getCategories' });
    if (response && response.success) {
      const select = document.getElementById('sellerCategoryFilter');
      // 既存のオプションをクリア（最初の「すべて」以外）
      while (select.options.length > 1) {
        select.remove(1);
      }
      // カテゴリを追加
      response.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('カテゴリ読み込みエラー:', error);
  }
}

/**
 * セラーリストを読み込む
 */
async function loadSellerList() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'seller_getSellers',
      categoryId: currentFilters.categoryId,
      type: currentFilters.type
    });

    const listContainer = document.getElementById('sellerList');

    if (!response || !response.success || response.sellers.length === 0) {
      listContainer.innerHTML = `
        <div class="seller-empty">
          <p>まだセラーが保存されていません</p>
          <p style="margin-top: 8px; font-size: 11px;">商品ページでセラーを保存すると、ここに表示されます</p>
        </div>
      `;
      return;
    }

    // カテゴリ情報を取得
    const catResponse = await chrome.runtime.sendMessage({ action: 'seller_getCategories' });
    const categories = catResponse.success ? catResponse.categories : [];
    const categoryMap = {};
    categories.forEach(cat => categoryMap[cat.id] = cat.name);

    let html = '';
    response.sellers.forEach(seller => {
      const typeInfo = SELLER_TYPES[seller.type] || SELLER_TYPES.other;
      const platformIcon = PLATFORM_ICONS[seller.platform] || '📦';
      const categoryNames = (seller.categoryIds || [])
        .map(id => categoryMap[id])
        .filter(name => name)
        .join(', ');

      html += `
        <div class="seller-item" data-seller-id="${seller.id}" data-seller-url="${escapeHtml(seller.url)}">
          <div class="seller-item-header">
            <span class="seller-type-icon" title="${typeInfo.label}">${typeInfo.icon}</span>
            <span class="seller-platform-icon" title="${seller.platform}">${platformIcon}</span>
            <span class="seller-name">${escapeHtml(seller.name)}</span>
          </div>
          ${seller.memo ? `<div class="seller-memo">${escapeHtml(seller.memo)}</div>` : ''}
          ${categoryNames ? `<div class="seller-memo">📁 ${escapeHtml(categoryNames)}</div>` : ''}
          <div class="seller-actions">
            <button class="seller-action-btn" data-action="open">🔗 開く</button>
            <button class="seller-action-btn" data-action="edit">✏️ 編集</button>
            <button class="seller-action-btn delete" data-action="delete">🗑️ 削除</button>
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;

    // イベントリスナーを設定
    listContainer.querySelectorAll('.seller-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.dataset.action;
        const sellerItem = btn.closest('.seller-item');
        const sellerId = sellerItem.dataset.sellerId;
        const sellerUrl = sellerItem.dataset.sellerUrl;

        if (action === 'open') {
          openSellerPage(sellerUrl);
        } else if (action === 'edit') {
          await editSeller(sellerId);
        } else if (action === 'delete') {
          await deleteSeller(sellerId);
        }
      });
    });
  } catch (error) {
    console.error('セラーリスト読み込みエラー:', error);
  }
}

/**
 * HTMLエスケープ
 */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (match) => {
    const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return escapes[match];
  });
}

/**
 * セラーページを開く
 */
function openSellerPage(url) {
  chrome.tabs.create({ url: url });
}

// 現在編集中のセラーの選択カテゴリを保持
let currentEditingSellerCategoryIds = [];

/**
 * セラーを編集（モーダル表示）
 */
async function editSeller(sellerId) {
  try {
    // セラー情報を取得
    const sellersResponse = await chrome.runtime.sendMessage({
      action: 'seller_getSellers'
    });

    if (!sellersResponse || !sellersResponse.success) {
      showToast('セラー情報の取得に失敗しました', 'error');
      return;
    }

    const seller = sellersResponse.sellers.find(s => s.id === sellerId);
    if (!seller) {
      showToast('セラーが見つかりません', 'error');
      return;
    }

    // 現在のカテゴリIDを保持
    currentEditingSellerCategoryIds = [...(seller.categoryIds || [])];

    // モーダルにデータを設定
    document.getElementById('editSellerId').value = sellerId;
    document.getElementById('editSellerName').textContent = seller.name;
    document.getElementById('editSellerMemo').value = seller.memo || '';

    // タイプボタンを設定
    document.querySelectorAll('#editSellerTypes .modal-type-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.type === seller.type);
    });

    // カテゴリボタンを生成
    await renderModalCategoryButtons();

    // タイプボタンのイベント（一度だけ設定するため、クローンで置換）
    document.querySelectorAll('#editSellerTypes .modal-type-btn').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        document.querySelectorAll('#editSellerTypes .modal-type-btn').forEach(b => b.classList.remove('selected'));
        newBtn.classList.add('selected');
      });
    });

    // モーダルを表示
    document.getElementById('editSellerModal').classList.remove('hidden');

  } catch (error) {
    console.error('セラー編集エラー:', error);
    showToast('エラーが発生しました', 'error');
  }
}

/**
 * モーダル内のカテゴリボタンを生成・更新
 */
async function renderModalCategoryButtons() {
  const catResponse = await chrome.runtime.sendMessage({ action: 'seller_getCategories' });
  const categories = catResponse.success ? catResponse.categories : [];

  const categoriesContainer = document.getElementById('editSellerCategories');

  if (categories.length === 0) {
    categoriesContainer.innerHTML = '<span style="color: #999; font-size: 11px;">カテゴリがありません（下のボタンで追加）</span>';
  } else {
    categoriesContainer.innerHTML = categories.map(cat => `
      <div class="modal-category-item">
        <button class="modal-category-btn ${currentEditingSellerCategoryIds.includes(cat.id) ? 'selected' : ''}"
                data-category-id="${cat.id}">${cat.name}</button>
        <button class="modal-category-delete" data-category-id="${cat.id}" title="カテゴリを削除">×</button>
      </div>
    `).join('');

    // カテゴリボタンのイベント
    categoriesContainer.querySelectorAll('.modal-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        // 選択状態を更新
        const catId = btn.dataset.categoryId;
        if (btn.classList.contains('selected')) {
          if (!currentEditingSellerCategoryIds.includes(catId)) {
            currentEditingSellerCategoryIds.push(catId);
          }
        } else {
          currentEditingSellerCategoryIds = currentEditingSellerCategoryIds.filter(id => id !== catId);
        }
      });
    });

    // カテゴリ削除ボタンのイベント
    categoriesContainer.querySelectorAll('.modal-category-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const catId = btn.dataset.categoryId;
        const catName = btn.previousElementSibling.textContent;
        await deleteCategoryInModal(catId, catName);
      });
    });
  }
}

/**
 * モーダル内でカテゴリを削除
 */
async function deleteCategoryInModal(categoryId, categoryName) {
  if (!confirm(`カテゴリ「${categoryName}」を削除しますか？\n（セラーは削除されません）`)) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'seller_deleteCategory',
      categoryId: categoryId
    });

    if (response && response.success) {
      // 選択中のカテゴリからも削除
      currentEditingSellerCategoryIds = currentEditingSellerCategoryIds.filter(id => id !== categoryId);

      // カテゴリボタンを再描画
      await renderModalCategoryButtons();

      // メインのカテゴリセレクトも更新
      await loadCategoryOptions();
      await loadSellerStats();

      showToast(`カテゴリ「${categoryName}」を削除しました`, 'success');
    } else {
      showToast('削除に失敗しました', 'error');
    }
  } catch (error) {
    console.error('カテゴリ削除エラー:', error);
    showToast('削除中にエラーが発生しました', 'error');
  }
}

/**
 * モーダル内でカテゴリを新規追加
 */
async function addCategoryInModal() {
  const name = prompt('新しいカテゴリ名を入力してください:');
  if (!name || !name.trim()) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'seller_addCategory',
      name: name.trim()
    });

    if (response && response.success) {
      // 新しいカテゴリを選択状態にする
      currentEditingSellerCategoryIds.push(response.categoryId);

      // カテゴリボタンを再描画
      await renderModalCategoryButtons();

      // メインのカテゴリセレクトも更新
      await loadCategoryOptions();
      await loadSellerStats();

      showToast(`カテゴリ「${name}」を追加しました`, 'success');
    } else {
      showToast('カテゴリの追加に失敗しました', 'error');
    }
  } catch (error) {
    console.error('カテゴリ追加エラー:', error);
    showToast('追加中にエラーが発生しました', 'error');
  }
}

/**
 * 編集モーダルを閉じる
 */
function closeEditModal() {
  document.getElementById('editSellerModal').classList.add('hidden');
}

/**
 * 編集を保存
 */
async function saveEditSeller() {
  const sellerId = document.getElementById('editSellerId').value;
  const memo = document.getElementById('editSellerMemo').value;

  // 選択されたタイプを取得
  const selectedTypeBtn = document.querySelector('#editSellerTypes .modal-type-btn.selected');
  const type = selectedTypeBtn ? selectedTypeBtn.dataset.type : 'other';

  // 選択されたカテゴリを取得
  const categoryIds = Array.from(document.querySelectorAll('#editSellerCategories .modal-category-btn.selected'))
    .map(btn => btn.dataset.categoryId);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'seller_update',
      sellerId: sellerId,
      updates: { type, categoryIds, memo }
    });

    if (response && response.success) {
      showToast('セラー情報を更新しました', 'success');
      closeEditModal();
      await loadSellerList();
    } else {
      showToast('更新に失敗しました', 'error');
    }
  } catch (error) {
    console.error('セラー更新エラー:', error);
    showToast('更新中にエラーが発生しました', 'error');
  }
}

/**
 * セラーを削除
 */
async function deleteSeller(sellerId) {
  if (!confirm('このセラーを削除しますか？')) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'seller_delete',
      sellerId: sellerId
    });

    if (response && response.success) {
      showToast('セラーを削除しました', 'success');
      await loadSellerStats();
      await loadSellerList();
    } else {
      showToast('削除に失敗しました', 'error');
    }
  } catch (error) {
    console.error('セラー削除エラー:', error);
    showToast('削除中にエラーが発生しました', 'error');
  }
}

/**
 * 新しいカテゴリを追加
 */
async function addNewCategory() {
  const name = prompt('新しいカテゴリ名を入力してください:');
  if (!name || !name.trim()) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'seller_addCategory',
      name: name.trim()
    });

    if (response && response.success) {
      showToast(`カテゴリ「${name}」を追加しました`, 'success');
      await loadSellerStats();
      await loadCategoryOptions();
    } else {
      showToast('カテゴリの追加に失敗しました', 'error');
    }
  } catch (error) {
    console.error('カテゴリ追加エラー:', error);
    showToast('追加中にエラーが発生しました', 'error');
  }
}

/**
 * カテゴリ管理画面を開く（簡易版：アラートで一覧表示）
 */
async function openCategoryManager() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'seller_getCategories' });
    if (!response || !response.success) {
      showToast('カテゴリの取得に失敗しました', 'error');
      return;
    }

    if (response.categories.length === 0) {
      alert('カテゴリがまだありません。\n「➕」ボタンで追加してください。');
      return;
    }

    let message = '📂 カテゴリ一覧\n\n';
    response.categories.forEach((cat, index) => {
      message += `${index + 1}. ${cat.name}\n`;
    });
    message += '\n削除したいカテゴリの番号を入力してください\n（キャンセルする場合は空欄のままOK）';

    const input = prompt(message);
    if (!input || !input.trim()) return;

    const index = parseInt(input) - 1;
    if (isNaN(index) || index < 0 || index >= response.categories.length) {
      alert('無効な番号です');
      return;
    }

    const categoryToDelete = response.categories[index];
    if (!confirm(`カテゴリ「${categoryToDelete.name}」を削除しますか？\n（セラーは削除されません）`)) return;

    const deleteResponse = await chrome.runtime.sendMessage({
      action: 'seller_deleteCategory',
      categoryId: categoryToDelete.id
    });

    if (deleteResponse && deleteResponse.success) {
      showToast(`カテゴリ「${categoryToDelete.name}」を削除しました`, 'success');
      await loadSellerStats();
      await loadCategoryOptions();
      await loadSellerList();
    } else {
      showToast('削除に失敗しました', 'error');
    }
  } catch (error) {
    console.error('カテゴリ管理エラー:', error);
    showToast('エラーが発生しました', 'error');
  }
}

/**
 * JSONエクスポート
 */
async function exportAsJson() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'seller_export', format: 'json' });
    if (response && response.success) {
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shiraberu-sellers-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('JSONファイルをダウンロードしました', 'success');
    } else {
      showToast('エクスポートに失敗しました', 'error');
    }
  } catch (error) {
    console.error('JSONエクスポートエラー:', error);
    showToast('エクスポート中にエラーが発生しました', 'error');
  }
}

/**
 * CSVエクスポート
 */
async function exportAsCsv() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'seller_export', format: 'csv' });
    if (response && response.success) {
      // BOM付きUTF-8でExcelでの文字化け防止
      const bom = '\uFEFF';
      const blob = new Blob([bom + response.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shiraberu-sellers-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSVファイルをダウンロードしました', 'success');
    } else {
      showToast('エクスポートに失敗しました', 'error');
    }
  } catch (error) {
    console.error('CSVエクスポートエラー:', error);
    showToast('エクスポート中にエラーが発生しました', 'error');
  }
}

