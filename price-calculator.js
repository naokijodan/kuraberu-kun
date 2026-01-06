/**
 * しらべる君 - 価格計算モジュール
 * eBay/メルカリ商品ページで価格計算を行う
 */

// デフォルト設定値
const PRICE_CALC_DEFAULTS = {
  exchangeRate: 155,
  targetProfitRate: 20,
  feeRate: 18,
  adRate: 10,
  payoneerRate: 2,
  safetyMargin: 3,
  tariffRate: 15,
  vatRate: 0,
  processingFeeRate: 2.1,
  mpf: 0,
  ceMpf: 296,
  mpfUsd: 0,
  euShippingDiff: 0,
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
  // 送料サーチャージ・割引設定
  fedexFuelSurcharge: 29.75,    // FedEx燃油サーチャージ（%）
  dhlFuelSurcharge: 30,         // DHL燃油サーチャージ（%）
  cpassDiscount: 3,             // Cpass割引（%）
  fedexExtraPer500g: 115,       // FedEx 500gごとの追加料金（円）
  dhlExtraPer500g: 96           // DHL 500gごとの追加料金（円）
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


/**
 * 価格計算クラス
 */
class PriceCalculator {
  constructor(settings = {}) {
    this.settings = { ...PRICE_CALC_DEFAULTS, ...settings };
  }

  /**
   * 設定を更新
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * chrome.storageから設定を読み込み
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['priceCalcSettings']);
      if (result.priceCalcSettings) {
        this.settings = { ...PRICE_CALC_DEFAULTS, ...result.priceCalcSettings };
      }
    } catch (e) {
      console.log('[価格計算] 設定読み込みエラー:', e);
    }
    return this.settings;
  }

  /**
   * eBay価格から仕入れ上限を計算（メイン機能）
   * @param {number} ebayPriceUSD - eBay販売価格（USD）
   * @param {boolean} isDDP - DDP価格かどうか（デフォルト: true）
   * @returns {Object} 計算結果
   */
  calculateMaxPurchasePrice(ebayPriceUSD, isDDP = true) {
    const s = this.settings;
    const feeRate = s.feeRate / 100;
    const adRate = s.adRate / 100;
    const payoneerRate = s.payoneerRate / 100;
    const tariffRate = s.tariffRate / 100;
    const targetProfitRate = s.targetProfitRate / 100;

    // 送料計算
    const shippingCostJPY = this._calculateShippingCost(s.shippingThreshold);

    // 配送方法を判定
    const effectiveMethod = this._getEffectiveShippingMethod(s.shippingThreshold);

    let sellingPriceUSD;
    let tariffUSD = 0;

    if (isDDP) {
      // DDP価格の場合、関税を逆算
      const tariffAmounts = this._calculateTariffAmounts(ebayPriceUSD, effectiveMethod);
      // DDP価格 = DDU価格 + 関税 なので、DDU価格を求める
      // 反復計算で求める
      sellingPriceUSD = ebayPriceUSD;
      for (let i = 0; i < 10; i++) {
        const tempTariff = this._calculateTariffAmounts(sellingPriceUSD, effectiveMethod);
        sellingPriceUSD = ebayPriceUSD - tempTariff.adjustedTariff;
        if (sellingPriceUSD < 0) sellingPriceUSD = ebayPriceUSD * 0.8;
      }
      tariffUSD = this._calculateTariffAmounts(sellingPriceUSD, effectiveMethod).actualTariff;
    } else {
      sellingPriceUSD = ebayPriceUSD;
      const tariffAmounts = this._calculateTariffAmounts(sellingPriceUSD, effectiveMethod);
      tariffUSD = tariffAmounts.actualTariff;
    }

    // 売上金額（円）
    const ddpPriceJPY = ebayPriceUSD * s.exchangeRate;
    const dduPriceJPY = sellingPriceUSD * s.exchangeRate;

    // 手数料計算（DDP価格ベース）
    const ebayFeeJPY = ddpPriceJPY * feeRate;
    const adFeeJPY = ddpPriceJPY * adRate;
    const afterEbayFees = ddpPriceJPY - ebayFeeJPY - adFeeJPY;
    const payoneerFeeJPY = afterEbayFees * payoneerRate;
    const afterPayoneer = afterEbayFees - payoneerFeeJPY;

    // 関税（円）
    const tariffJPY = tariffUSD * s.exchangeRate;

    // 利益を確保した場合の仕入れ上限
    // 利益 = 入金額 - 関税 - 仕入れ - 送料
    // 利益率 = 利益 / DDP売上
    // targetProfitRate = (afterPayoneer - tariffJPY - costJPY - shippingCostJPY) / ddpPriceJPY
    // costJPY = afterPayoneer - tariffJPY - shippingCostJPY - (targetProfitRate * ddpPriceJPY)
    const targetProfitJPY = ddpPriceJPY * targetProfitRate;
    const maxCostJPY = afterPayoneer - tariffJPY - shippingCostJPY - targetProfitJPY;

    // 利益0円の場合の仕入れ上限
    const breakEvenCostJPY = afterPayoneer - tariffJPY - shippingCostJPY;

    // 実際の利益計算（仕入れ上限で購入した場合）
    const actualProfitJPY = afterPayoneer - tariffJPY - maxCostJPY - shippingCostJPY;
    const actualProfitRate = (actualProfitJPY / ddpPriceJPY) * 100;

    return {
      // 入力
      ebayPriceUSD,
      isDDP,
      // 価格
      ddpPriceUSD: ebayPriceUSD,
      dduPriceUSD: sellingPriceUSD,
      ddpPriceJPY: Math.round(ddpPriceJPY),
      dduPriceJPY: Math.round(dduPriceJPY),
      // 手数料
      ebayFeeJPY: Math.round(ebayFeeJPY),
      adFeeJPY: Math.round(adFeeJPY),
      payoneerFeeJPY: Math.round(payoneerFeeJPY),
      totalFeesJPY: Math.round(ebayFeeJPY + adFeeJPY + payoneerFeeJPY),
      // 関税
      tariffUSD,
      tariffJPY: Math.round(tariffJPY),
      // 送料
      shippingCostJPY,
      shippingMethod: effectiveMethod,
      shippingMethodName: this._getMethodName(effectiveMethod),
      // 仕入れ上限
      maxCostJPY: Math.round(Math.max(0, maxCostJPY)),
      breakEvenCostJPY: Math.round(Math.max(0, breakEvenCostJPY)),
      // 利益
      targetProfitRate: s.targetProfitRate,
      targetProfitJPY: Math.round(targetProfitJPY),
      actualProfitJPY: Math.round(actualProfitJPY),
      actualProfitRate: actualProfitRate.toFixed(1),
      // 為替
      exchangeRate: s.exchangeRate
    };
  }

  /**
   * メルカリ価格からeBay販売価格を計算（メイン機能）
   * @param {number} mercariPriceJPY - メルカリ価格（円）
   * @returns {Object} 計算結果
   */
  calculateEbaySellingPrice(mercariPriceJPY) {
    const s = this.settings;
    const feeRate = s.feeRate / 100;
    const adRate = s.adRate / 100;
    const payoneerRate = s.payoneerRate / 100;
    const targetProfitRate = s.targetProfitRate / 100;

    // 送料計算
    const shippingCostJPY = this._calculateShippingCost(mercariPriceJPY);

    // 配送方法を判定
    const effectiveMethod = this._getEffectiveShippingMethod(mercariPriceJPY);

    // 目標利益額
    const costJPY = mercariPriceJPY;

    // 反復計算で販売価格を求める
    // 初期値
    let sellingPriceUSD = (costJPY + shippingCostJPY) / s.exchangeRate / (1 - feeRate - adRate - targetProfitRate);

    for (let i = 0; i < 20; i++) {
      // 関税計算
      const tariffAmounts = this._calculateTariffAmounts(sellingPriceUSD, effectiveMethod);

      // DDP価格
      const ddpPrice = sellingPriceUSD + tariffAmounts.adjustedTariff;

      // 利益計算
      const ddpPriceJPY = ddpPrice * s.exchangeRate;
      const ebayFeeJPY = ddpPriceJPY * feeRate;
      const adFeeJPY = ddpPriceJPY * adRate;
      const afterEbayFees = ddpPriceJPY - ebayFeeJPY - adFeeJPY;
      const payoneerFeeJPY = afterEbayFees * payoneerRate;
      const afterPayoneer = afterEbayFees - payoneerFeeJPY;
      const actualTariffJPY = tariffAmounts.actualTariff * s.exchangeRate;
      const calculatedProfit = afterPayoneer - actualTariffJPY - costJPY - shippingCostJPY;

      // 目標利益率との差分
      const currentProfitRate = calculatedProfit / ddpPriceJPY;
      const rateDiff = targetProfitRate - currentProfitRate;

      // 収束判定
      if (Math.abs(rateDiff) < 0.0001) break;

      // 販売価格を調整
      sellingPriceUSD *= (1 + rateDiff);
    }

    // 最終計算
    const tariffAmounts = this._calculateTariffAmounts(sellingPriceUSD, effectiveMethod);
    const ddpPriceUSD = sellingPriceUSD + tariffAmounts.adjustedTariff;
    const ddpPriceJPY = ddpPriceUSD * s.exchangeRate;

    // 利益計算
    const ebayFeeJPY = ddpPriceJPY * feeRate;
    const adFeeJPY = ddpPriceJPY * adRate;
    const afterEbayFees = ddpPriceJPY - ebayFeeJPY - adFeeJPY;
    const payoneerFeeJPY = afterEbayFees * payoneerRate;
    const afterPayoneer = afterEbayFees - payoneerFeeJPY;
    const actualTariffJPY = tariffAmounts.actualTariff * s.exchangeRate;
    const profitJPY = afterPayoneer - actualTariffJPY - costJPY - shippingCostJPY;
    const profitRate = (profitJPY / ddpPriceJPY) * 100;

    return {
      // 入力
      mercariPriceJPY,
      // 販売価格
      dduPriceUSD: Math.round(sellingPriceUSD * 100) / 100,
      ddpPriceUSD: Math.round(ddpPriceUSD * 100) / 100,
      ddpPriceJPY: Math.round(ddpPriceJPY),
      // 手数料
      ebayFeeJPY: Math.round(ebayFeeJPY),
      adFeeJPY: Math.round(adFeeJPY),
      payoneerFeeJPY: Math.round(payoneerFeeJPY),
      totalFeesJPY: Math.round(ebayFeeJPY + adFeeJPY + payoneerFeeJPY),
      // 関税
      tariffUSD: tariffAmounts.actualTariff,
      tariffJPY: Math.round(actualTariffJPY),
      // 送料
      shippingCostJPY,
      shippingMethod: effectiveMethod,
      shippingMethodName: this._getMethodName(effectiveMethod),
      // 利益
      profitJPY: Math.round(profitJPY),
      profitRate: profitRate.toFixed(1),
      targetProfitRate: s.targetProfitRate,
      // 為替
      exchangeRate: s.exchangeRate
    };
  }

  /**
   * 送料を計算
   */
  _calculateShippingCost(costJPY) {
    const s = this.settings;

    if (s.shippingMode === 'fixed') {
      return s.shippingCost;
    }

    // テーブル計算
    const volume = s.packageLength * s.packageWidth * s.packageHeight;
    const effectiveMethod = this._getEffectiveShippingMethod(costJPY);
    const volWeight = this._calculateVolWeightByMethod(effectiveMethod, volume);
    const chargeableWeight = Math.max(s.actualWeight, volWeight);

    return this._calculateSpecificMethodRate(effectiveMethod, s.actualWeight, chargeableWeight) || s.shippingCost;
  }

  /**
   * 実際に使用される配送方法を判定
   */
  _getEffectiveShippingMethod(costJPY) {
    const s = this.settings;

    if (s.shippingMethod && s.shippingMethod !== '自動選択') {
      return s.shippingMethod;
    }

    if (s.lowPriceMethod === 'NONE' || costJPY >= s.shippingThreshold) {
      return s.highPriceMethod;
    }

    if (s.lowPriceMethod === 'EP' && s.actualWeight > 2000) {
      return s.highPriceMethod;
    }

    return s.lowPriceMethod;
  }

  /**
   * 配送方法に応じた容積重量計算
   */
  _calculateVolWeightByMethod(method, volume) {
    if (!volume) return 0;

    let volumetricWeight;
    if (method === 'CE') {
      volumetricWeight = Math.round(volume / 8);
    } else {
      volumetricWeight = Math.round(volume / 5);
    }
    return Math.max(volumetricWeight, 100);
  }

  /**
   * 関税額を計算
   */
  _calculateTariffAmounts(sellingPriceUSD, effectiveMethod) {
    const s = this.settings;
    const tariffRate = s.tariffRate / 100;
    const vatRate = s.vatRate / 100;
    const processingFeeRate = s.processingFeeRate / 100;
    const safetyMargin = s.safetyMargin / 100;
    const feeRate = s.feeRate / 100;
    const adRate = s.adRate / 100;

    const customsFeeJPY = (effectiveMethod === 'CE') ? s.ceMpf : 0;

    // 実際の関税額
    const actualTariff = sellingPriceUSD * tariffRate * (1 + processingFeeRate)
                       + sellingPriceUSD * vatRate * processingFeeRate
                       + (customsFeeJPY / s.exchangeRate)
                       + s.mpfUsd
                       + (s.euShippingDiff / s.exchangeRate);

    // 調整関税率
    const denominator = 1 - feeRate - adRate;
    const adjustedTariffRate = denominator > 0
      ? (tariffRate / denominator) * (1 + safetyMargin)
      : tariffRate;

    // 調整後の関税額
    const adjustedTariff = sellingPriceUSD * adjustedTariffRate * (1 + processingFeeRate)
                         + sellingPriceUSD * vatRate * processingFeeRate
                         + (customsFeeJPY / s.exchangeRate)
                         + s.mpfUsd
                         + (s.euShippingDiff / s.exchangeRate);

    return {
      actualTariff,
      adjustedTariff,
      difference: adjustedTariff - actualTariff
    };
  }

  /**
   * 配送方法別の料金計算
   */
  _calculateSpecificMethodRate(method, actualWeight, chargeableWeight) {
    switch (method) {
      case 'EP':
        return this._getEpacketRate(actualWeight);
      case 'CF':
        return this._getCpassFedexRate(chargeableWeight);
      case 'CD':
        return this._getCpassDHLRate(chargeableWeight);
      case 'EL':
        return this._getElogiRate(chargeableWeight);
      case 'CE':
        return this._getCpassEconomyRate(chargeableWeight);
      case 'EMS':
        return this._getEMSRate(actualWeight);
      default:
        return this._getCpassFedexRate(chargeableWeight);
    }
  }

  _getEpacketRate(weight) {
    if (weight > 2000) return null;
    for (const rate of SHIPPING_RATE_TABLE.EP) {
      if (weight >= rate.min && weight <= rate.max) {
        return rate.yen;
      }
    }
    return null;
  }

  _getCpassFedexRate(weight) {
    const s = this.settings;
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
    const extra = overUnits * s.fedexExtraPer500g;
    const subTotal = base + extra;
    // 燃油サーチャージ
    const fuel = subTotal * (s.fedexFuelSurcharge / 100);
    // Cpass割引
    const discount = -(subTotal + fuel) * (s.cpassDiscount / 100);
    return Math.round(subTotal + fuel + discount);
  }

  _getCpassDHLRate(weight) {
    const s = this.settings;
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
    const extra = overUnits * s.dhlExtraPer500g;
    const subTotal = base + extra;
    // 燃油サーチャージ
    const fuel = subTotal * (s.dhlFuelSurcharge / 100);
    // Cpass割引
    const discount = -(subTotal + fuel) * (s.cpassDiscount / 100);
    return Math.round(subTotal + fuel + discount);
  }

  _getElogiRate(weight) {
    for (const rate of SHIPPING_RATE_TABLE.EL) {
      if (weight >= rate.min && weight <= rate.max) {
        return rate.yen;
      }
    }
    return 999999;
  }

  _getCpassEconomyRate(weight) {
    for (const rate of SHIPPING_RATE_TABLE.CE) {
      if (weight >= rate.min && weight <= rate.max) {
        return rate.yen !== null ? rate.yen : 999999;
      }
    }
    return 999999;
  }

  _getEMSRate(weight) {
    for (const rate of SHIPPING_RATE_TABLE.EMS) {
      if (weight >= rate.min && weight <= rate.max) {
        return rate.yen;
      }
    }
    return 999999;
  }

  /**
   * 配送方法の表示名を取得
   */
  _getMethodName(code) {
    const names = {
      'EP': 'eパケット',
      'CE': 'Cpass-Economy',
      'CF': 'Cpass-FedEx',
      'CD': 'Cpass-DHL',
      'EL': 'eLogistics',
      'EMS': 'EMS'
    };
    return names[code] || code;
  }
}

// グローバルに公開
window.PriceCalculator = PriceCalculator;
