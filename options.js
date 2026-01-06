/**
 * しらべる君 - Options Page Script
 * 価格計算設定を含む全設定の管理
 */

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

// 送料テーブル（元の価格計算ツールから取得）
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
  CF: [ // Cpass-FedEx
    { min: 1, max: 1000, yen: 1984 }, { min: 1001, max: 1500, yen: 2439 }, { min: 1501, max: 2000, yen: 2666 },
    { min: 2001, max: 2500, yen: 2918 }, { min: 2501, max: 3000, yen: 3173 }, { min: 3001, max: 3500, yen: 3329 },
    { min: 3501, max: 4000, yen: 3382 }, { min: 4001, max: 4500, yen: 3786 }, { min: 4501, max: 5000, yen: 4188 },
    { min: 5001, max: 5500, yen: 4495 }, { min: 5501, max: 6000, yen: 4805 }, { min: 6001, max: 6500, yen: 5114 },
    { min: 6501, max: 7000, yen: 5465 }, { min: 7001, max: 7500, yen: 5893 }, { min: 7501, max: 8000, yen: 6267 },
    { min: 8001, max: 8500, yen: 6444 }, { min: 8501, max: 9000, yen: 6621 }, { min: 9001, max: 9500, yen: 6797 },
    { min: 9501, max: 10000, yen: 8327 }, { min: 10001, max: 30000, yen: 31920 }
  ],
  CD: [ // Cpass-DHL
    { min: 1, max: 1000, yen: 2191 }, { min: 1001, max: 1500, yen: 2482 }, { min: 1501, max: 2000, yen: 2588 },
    { min: 2001, max: 2500, yen: 2719 }, { min: 2501, max: 3000, yen: 3040 }, { min: 3001, max: 3500, yen: 3358 },
    { min: 3501, max: 4000, yen: 3753 }, { min: 4001, max: 4500, yen: 4079 }, { min: 4501, max: 5000, yen: 4406 },
    { min: 5001, max: 5500, yen: 4732 }, { min: 5501, max: 6000, yen: 5058 }, { min: 6001, max: 6500, yen: 5383 },
    { min: 6501, max: 7000, yen: 5753 }, { min: 7001, max: 7500, yen: 6203 }, { min: 7501, max: 8000, yen: 6652 },
    { min: 8001, max: 8500, yen: 7102 }, { min: 8501, max: 9000, yen: 7550 }, { min: 9001, max: 9500, yen: 7999 },
    { min: 9501, max: 10000, yen: 8449 }, { min: 10001, max: 30000, yen: 31343 }
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


document.addEventListener('DOMContentLoaded', async () => {
  // 保存済みの設定を読み込み
  await loadAllSettings();

  // イベントリスナーを設定
  setupEventListeners();

  // 送料モード切替
  toggleShippingMode();

  // 容積重量計算のイベントを設定
  setupVolumetricWeightListeners();
});

/**
 * 全設定を読み込み
 */
async function loadAllSettings() {
  const result = await chrome.storage.sync.get(['openaiApiKey', 'priceCalcSettings']);

  // APIキー
  const apiKey = result.openaiApiKey || '';
  document.getElementById('openaiKey').value = apiKey;
  updateApiKeyStatus(!!apiKey);

  // 価格計算設定
  const settings = result.priceCalcSettings || DEFAULT_SETTINGS;
  applySettingsToForm(settings);
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
 * フォームから設定を取得
 */
function getSettingsFromForm() {
  return {
    exchangeRate: parseFloat(document.getElementById('exchangeRate').value) || DEFAULT_SETTINGS.exchangeRate,
    targetProfitRate: parseFloat(document.getElementById('targetProfitRate').value) || DEFAULT_SETTINGS.targetProfitRate,
    feeRate: parseFloat(document.getElementById('feeRate').value) || DEFAULT_SETTINGS.feeRate,
    adRate: parseFloat(document.getElementById('adRate').value) || DEFAULT_SETTINGS.adRate,
    payoneerRate: parseFloat(document.getElementById('payoneerRate').value) || DEFAULT_SETTINGS.payoneerRate,
    safetyMargin: parseFloat(document.getElementById('safetyMargin').value) || DEFAULT_SETTINGS.safetyMargin,
    tariffRate: parseFloat(document.getElementById('tariffRate').value) || DEFAULT_SETTINGS.tariffRate,
    vatRate: parseFloat(document.getElementById('vatRate').value) || DEFAULT_SETTINGS.vatRate,
    processingFeeRate: parseFloat(document.getElementById('processingFeeRate').value) || DEFAULT_SETTINGS.processingFeeRate,
    mpf: parseFloat(document.getElementById('mpf').value) || 0,
    ceMpf: parseFloat(document.getElementById('ceMpf').value) || DEFAULT_SETTINGS.ceMpf,
    mpfUsd: parseFloat(document.getElementById('mpfUsd').value) || 0,
    euShippingDiff: parseFloat(document.getElementById('euShippingDiff').value) || 0,
    shippingMode: document.getElementById('shippingMode').value,
    shippingCost: parseFloat(document.getElementById('shippingCost').value) || DEFAULT_SETTINGS.shippingCost,
    shippingThreshold: parseFloat(document.getElementById('shippingThreshold').value) || DEFAULT_SETTINGS.shippingThreshold,
    lowPriceMethod: document.getElementById('lowPriceMethod').value,
    highPriceMethod: document.getElementById('highPriceMethod').value,
    actualWeight: parseFloat(document.getElementById('actualWeight').value) || DEFAULT_SETTINGS.actualWeight,
    packageLength: parseFloat(document.getElementById('packageLength').value) || DEFAULT_SETTINGS.packageLength,
    packageWidth: parseFloat(document.getElementById('packageWidth').value) || DEFAULT_SETTINGS.packageWidth,
    packageHeight: parseFloat(document.getElementById('packageHeight').value) || DEFAULT_SETTINGS.packageHeight,
    shippingMethod: document.getElementById('shippingMethod').value,
    // サーチャージ・割引設定
    fedexFuelSurcharge: parseFloat(document.getElementById('fedexFuelSurcharge').value) || DEFAULT_SETTINGS.fedexFuelSurcharge,
    dhlFuelSurcharge: parseFloat(document.getElementById('dhlFuelSurcharge').value) || DEFAULT_SETTINGS.dhlFuelSurcharge,
    cpassDiscount: parseFloat(document.getElementById('cpassDiscount').value) || DEFAULT_SETTINGS.cpassDiscount,
    fedexExtraPer500g: parseFloat(document.getElementById('fedexExtraPer500g').value) || DEFAULT_SETTINGS.fedexExtraPer500g,
    dhlExtraPer500g: parseFloat(document.getElementById('dhlExtraPer500g').value) || DEFAULT_SETTINGS.dhlExtraPer500g
  };
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // パスワード表示切り替え
  document.getElementById('toggleVisibility').addEventListener('click', () => {
    const input = document.getElementById('openaiKey');
    const btn = document.getElementById('toggleVisibility');

    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });

  // 保存ボタン
  document.getElementById('saveBtn').addEventListener('click', saveAllSettings);

  // リセットボタン
  document.getElementById('resetBtn').addEventListener('click', resetToDefaults);

  // 送料モード変更
  document.getElementById('shippingMode').addEventListener('change', toggleShippingMode);

  // 為替レート更新ボタン
  document.getElementById('refreshRateBtn').addEventListener('click', refreshExchangeRate);

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
  const apiKey = document.getElementById('openaiKey').value.trim();

  // APIキーのバリデーション（空でない場合）
  if (apiKey && !apiKey.startsWith('sk-')) {
    showToast('無効なAPIキー形式です（sk-で始まる必要があります）', 'error');
    return;
  }

  // 価格計算設定を取得
  const priceCalcSettings = getSettingsFromForm();

  // 保存
  await chrome.storage.sync.set({
    openaiApiKey: apiKey,
    priceCalcSettings: priceCalcSettings
  });

  showToast('すべての設定を保存しました', 'success');
  updateApiKeyStatus(!!apiKey);

  // 保存ステータス表示
  const statusEl = document.getElementById('saveStatus');
  statusEl.className = 'status status-success';
  statusEl.innerHTML = '✅ 設定が保存されました';
  setTimeout(() => {
    statusEl.innerHTML = '';
    statusEl.className = '';
  }, 3000);
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
 * APIキーステータス表示を更新
 */
function updateApiKeyStatus(hasKey) {
  const statusEl = document.getElementById('apiKeyStatus');

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
