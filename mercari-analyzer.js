/**
 * しらべる君 - メルカリ検索結果 分析スクリプト
 * メルカリの検索結果ページから価格データを収集・分析
 */
(function() {
  'use strict';

  console.log('[しらべる君 メルカリ] 分析スクリプト読み込み');

  // 累積データ
  let collectedPrices = [];
  let currentPanel = null;
  let currentButton = null;
  let currentSearchKeyword = '';
  let isPremiumUser = false;

  /**
   * プレミアム状態をチェック
   */
  async function checkPremiumStatus() {
    try {
      const data = await chrome.storage.local.get(['shiraberu_secret_code']);
      const secretCode = data.shiraberu_secret_code;
      isPremiumUser = secretCode && ['MGOOSE2025'].includes(secretCode.trim().toUpperCase());
      console.log('[しらべる君 メルカリ] プレミアム状態:', isPremiumUser);
      return isPremiumUser;
    } catch (error) {
      console.error('[しらべる君 メルカリ] プレミアムチェックエラー:', error);
      return false;
    }
  }

  /**
   * プレミアム機能の案内パネルを表示
   */
  function showPremiumPrompt() {
    if (currentPanel) {
      currentPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'kuraberu-mercari-panel';
    panel.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        width: 320px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 10000;
        overflow: hidden;
      ">
        <div style="
          background: linear-gradient(135deg, #ff5252 0%, #d50000 100%);
          color: white;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span style="font-weight: 600;">🔒 プレミアム機能</span>
          <button id="kuraberu-mercari-close" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
          ">✕</button>
        </div>
        <div style="padding: 20px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
          <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 12px;">
            メルカリ価格分析機能
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 20px; line-height: 1.6;">
            価格分析機能はプレミアム会員限定です。<br>
            スクール会員の方はシークレットコードを入力してください。
          </div>
          <div style="
            background: #f5f5f5;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          ">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 20px; margin-right: 10px;">🎫</span>
              <span style="font-size: 13px; color: #333;">スクール会員の方はシークレットコードを入力</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="font-size: 20px; margin-right: 10px;">💳</span>
              <span style="font-size: 13px; color: #333;">1,000円で全機能を永久解放</span>
            </div>
          </div>
          <button id="kuraberu-mercari-go-settings" style="
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #ff5252 0%, #d50000 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          ">⚙️ 設定画面へ</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    currentPanel = panel;

    document.getElementById('kuraberu-mercari-close').addEventListener('click', () => {
      panel.remove();
      currentPanel = null;
    });

    document.getElementById('kuraberu-mercari-go-settings').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openOptionsPage' });
    });
  }

  /**
   * メルカリ検索結果ページかどうかを判定
   */
  function isSearchResultsPage() {
    const url = window.location.href;
    return url.includes('jp.mercari.com/search');
  }

  /**
   * Next.jsの__NEXT_DATA__から価格データを抽出（高速・正確）
   */
  function extractPricesFromNextData() {
    try {
      const nextDataScript = document.getElementById('__NEXT_DATA__');
      if (!nextDataScript) {
        console.log('[しらべる君 メルカリ] __NEXT_DATA__が見つかりません');
        return null;
      }

      const data = JSON.parse(nextDataScript.textContent);
      const prices = [];

      // Next.jsのデータ構造を探索
      const searchData = data?.props?.pageProps;
      if (!searchData) {
        console.log('[しらべる君 メルカリ] pagePropsが見つかりません');
        return null;
      }

      // 商品リストを探す（複数のパスを試す）
      let items = searchData?.searchResult?.items ||
                  searchData?.items ||
                  searchData?.data?.items ||
                  searchData?.search?.items ||
                  null;

      // dehydratedStateからも探す
      if (!items && searchData?.dehydratedState?.queries) {
        for (const query of searchData.dehydratedState.queries) {
          if (query?.state?.data?.items) {
            items = query.state.data.items;
            break;
          }
          if (query?.state?.data?.data) {
            items = query.state.data.data;
            break;
          }
        }
      }

      if (!items || !Array.isArray(items)) {
        console.log('[しらべる君 メルカリ] 商品データが見つかりません', Object.keys(searchData));
        return null;
      }

      console.log('[しらべる君 メルカリ] __NEXT_DATA__から商品発見:', items.length, '件');

      items.forEach((item, index) => {
        // PR/広告商品を除外
        if (item.itemType === 'ITEM_TYPE_BEYOND' ||
            item.itemType === 'AD' ||
            item.isAd ||
            item.isBeyond) {
          return;
        }

        // 価格を取得
        let price = 0;
        if (item.price) {
          price = typeof item.price === 'number' ? item.price : parseInt(item.price, 10);
        } else if (item.displayPrice) {
          price = parseInt(String(item.displayPrice).replace(/[¥,]/g, ''), 10);
        }

        if (price > 0 && price < 100000000) {
          prices.push(price);
          if (index < 3) {
            console.log(`[しらべる君 メルカリ] NEXT_DATA商品${index + 1}: ¥${price.toLocaleString()} (${item.name?.substring(0, 20)}...)`);
          }
        }
      });

      console.log('[しらべる君 メルカリ] __NEXT_DATA__から抽出:', prices.length, '件');
      return prices.length > 0 ? prices : null;

    } catch (error) {
      console.error('[しらべる君 メルカリ] __NEXT_DATA__解析エラー:', error);
      return null;
    }
  }

  /**
   * PR/スポンサー商品かどうかを判定
   */
  function isAdOrSponsor(item) {
    // PR商品を除外（PRバッジがある商品）
    const prBadge = item.querySelector('[class*="Badge"]');
    if (prBadge && prBadge.textContent.includes('PR')) {
      return true;
    }

    // テキスト内に「PR」があるかチェック
    const itemText = item.textContent || '';
    if (itemText.includes('PR') && itemText.indexOf('PR') < 50) {
      // 先頭付近にPRがある場合は広告の可能性
      return true;
    }

    // スポンサー・関連商品セクション内かどうかチェック
    const parent = item.closest('[class*="sponsor"]') ||
                   item.closest('[class*="Sponsor"]') ||
                   item.closest('[class*="related"]') ||
                   item.closest('[class*="Related"]');
    if (parent) {
      return true;
    }

    // 外部サイトのリンクかどうかチェック
    const link = item.querySelector('a') || (item.tagName === 'A' ? item : null);
    if (link) {
      const href = link.getAttribute('href') || '';
      // メルカリ内部リンク以外は除外
      if (href.startsWith('http') && !href.includes('jp.mercari.com')) {
        return true;
      }
    }

    return false;
  }

  /**
   * ページから価格データを抽出
   */
  function extractPrices() {
    // まず__NEXT_DATA__から取得を試みる（高速・正確）
    const nextDataPrices = extractPricesFromNextData();
    if (nextDataPrices && nextDataPrices.length > 0) {
      return nextDataPrices;
    }

    // フォールバック: DOMから抽出
    console.log('[しらべる君 メルカリ] DOMからの抽出にフォールバック');
    const prices = [];
    const seenItems = new Set(); // 重複防止用
    let skippedAds = 0;

    // 複数のセレクタを試す（メルカリはDOM構造が変わることがある）
    const selectors = [
      '[data-testid="item-cell"]',
      '[data-testid="search-result"] li',
      'li[data-testid]',
      'a[href^="/item/"]'
    ];

    let items = [];
    for (const selector of selectors) {
      items = document.querySelectorAll(selector);
      if (items.length > 0) {
        console.log('[しらべる君 メルカリ] セレクタ成功:', selector, '件数:', items.length);
        break;
      }
    }

    // 商品リンクから直接取得するアプローチ
    if (items.length === 0) {
      // 商品リンクを全て取得して、そこから価格を探す
      items = document.querySelectorAll('a[href*="/item/m"]');
      console.log('[しらべる君 メルカリ] 商品リンクから取得:', items.length, '件');
    }

    console.log('[しらべる君 メルカリ] 検出アイテム数:', items.length);

    items.forEach((item, index) => {
      // PR/スポンサー商品を除外
      if (isAdOrSponsor(item)) {
        skippedAds++;
        return;
      }

      // 商品IDで重複チェック（href属性から商品IDを抽出）
      const link = item.querySelector('a[href*="/item/"]') || (item.tagName === 'A' ? item : null);
      if (link) {
        const href = link.getAttribute('href');
        // メルカリの商品リンクのみを対象（/item/m で始まる）
        if (!href.includes('/item/m')) {
          return; // メルカリ商品以外はスキップ
        }
        const itemIdMatch = href.match(/\/item\/(m[a-zA-Z0-9]+)/);
        if (itemIdMatch) {
          const itemId = itemIdMatch[1];
          if (seenItems.has(itemId)) {
            return; // 既に処理済み
          }
          seenItems.add(itemId);
        }
      }

      let price = 0;
      let priceSource = '';

      // 方法1: 価格専用のspan要素を探す（¥記号を含む）
      const priceSpans = item.querySelectorAll('span');
      for (const span of priceSpans) {
        const text = span.textContent.trim();
        // ¥で始まり、数字のみ（子要素がない単純なテキスト）
        if (text.match(/^¥[\d,]+$/) && span.children.length === 0) {
          const match = text.match(/¥([\d,]+)/);
          if (match) {
            const p = parseInt(match[1].replace(/,/g, ''), 10);
            if (p > 0 && p < 100000000) {
              price = p;
              priceSource = 'span直接';
              break;
            }
          }
        }
      }

      // 方法2: merPrice クラスから取得
      if (price === 0) {
        const merPrice = item.querySelector('[class*="merPrice"]');
        if (merPrice) {
          const priceText = merPrice.textContent.trim();
          const match = priceText.match(/¥([\d,]+)/);
          if (match) {
            const p = parseInt(match[1].replace(/,/g, ''), 10);
            if (p > 0 && p < 100000000) {
              price = p;
              priceSource = 'merPrice';
            }
          }
        }
      }

      // 方法3: price を含むクラス名から取得
      if (price === 0) {
        const priceEl = item.querySelector('[class*="price"]');
        if (priceEl) {
          const priceText = priceEl.textContent.trim();
          const match = priceText.match(/¥([\d,]+)/);
          if (match) {
            const p = parseInt(match[1].replace(/,/g, ''), 10);
            if (p > 0 && p < 100000000) {
              price = p;
              priceSource = 'priceクラス';
            }
          }
        }
      }

      if (price > 0) {
        prices.push(price);
        if (index < 5) {
          console.log(`[しらべる君 メルカリ] 商品${index + 1}: ¥${price.toLocaleString()} (${priceSource})`);
        }
      }
    });

    console.log('[しらべる君 メルカリ] 抽出した価格:', prices.length, '件');
    console.log('[しらべる君 メルカリ] スキップしたPR/広告:', skippedAds, '件');
    if (prices.length > 0) {
      console.log('[しらべる君 メルカリ] 価格サンプル:', prices.slice(0, 10).map(p => '¥' + p.toLocaleString()));
      console.log('[しらべる君 メルカリ] 最小:', Math.min(...prices), '最大:', Math.max(...prices));
    }
    return prices;
  }

  /**
   * 価格テキストをパース（円）
   */
  function parsePriceText(text) {
    if (!text) return 0;
    // ¥, 円, カンマを除去して数値を抽出
    const cleanText = text.replace(/[¥￥円,，\s]/g, '');
    const match = cleanText.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  /**
   * 統計を計算
   */
  function calculateStats(prices) {
    if (prices.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, median: 0 };
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      count: prices.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: avg,
      median: median
    };
  }

  /**
   * 分析パネルを表示
   */
  function showAnalysisPanel() {
    if (currentPanel) {
      currentPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'kuraberu-mercari-panel';
    panel.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        width: 320px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 10000;
        overflow: hidden;
      ">
        <div style="
          background: linear-gradient(135deg, #ff5252 0%, #d50000 100%);
          color: white;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span style="font-weight: 600;">📊 しらべる君 - メルカリ価格分析</span>
          <button id="kuraberu-mercari-close" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
          ">✕</button>
        </div>
        <div style="padding: 16px;">
          <div id="kuraberu-mercari-stats" style="margin-bottom: 16px;">
            <div style="color: #666; font-size: 13px; margin-bottom: 8px;">読み込み中...</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="kuraberu-mercari-refresh" style="
              flex: 1;
              padding: 10px;
              background: #f0f0f0;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              cursor: pointer;
            ">🔄 再読込</button>
            <button id="kuraberu-mercari-add-page" style="
              flex: 1;
              padding: 10px;
              background: linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              cursor: pointer;
            ">➕ 次ページ追加</button>
          </div>
          <div id="kuraberu-mercari-message" style="
            margin-top: 12px;
            font-size: 12px;
            color: #666;
          "></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    currentPanel = panel;

    // パネル内部の要素を取得
    const panelInner = panel.querySelector('div');
    const panelHeader = panelInner.querySelector('div');

    // パネルをドラッグ可能に
    makeDraggable(panelInner, panelHeader);

    // イベントリスナー
    document.getElementById('kuraberu-mercari-close').addEventListener('click', () => {
      panel.remove();
      currentPanel = null;
    });

    document.getElementById('kuraberu-mercari-refresh').addEventListener('click', () => {
      collectedPrices = [];
      clearAccumulatedData();
      analyzePage();
      showMessage('🔄 データをリセットしました');
    });

    document.getElementById('kuraberu-mercari-add-page').addEventListener('click', () => {
      analyzePage(true);
    });

    // 仮想スクロール対応：常に自動スクロール収集を実行
    console.log('[しらべる君 メルカリ] 自動スクロール収集を開始');
    clearAccumulatedData(); // 古いデータをクリア
    waitForItemsAndAnalyze();
  }

  /**
   * 自動スクロールしながら商品データを収集
   */
  function waitForItemsAndAnalyze() {
    const statsEl = document.getElementById('kuraberu-mercari-stats');

    const updateStatus = (message) => {
      if (statsEl) {
        statsEl.innerHTML = `
          <div style="color: #666; font-size: 13px; text-align: center;">
            <div style="margin-bottom: 8px;">⏳ ${message}</div>
          </div>
        `;
      }
    };

    updateStatus('商品データを収集中...');

    const allPrices = new Set(); // 重複防止
    let scrollCount = 0;
    const maxScrolls = 15; // 最大15回スクロール（ページ全体をカバー）
    const originalScrollY = window.scrollY;

    let lastScrollY = -1;

    const collectAndScroll = () => {
      // 現在表示されている価格を収集
      const currentPrices = extractPrices();
      currentPrices.forEach(p => allPrices.add(p));

      console.log(`[しらべる君 メルカリ] スクロール${scrollCount}: 現在${currentPrices.length}件, 累計${allPrices.size}件`);
      updateStatus(`商品データを収集中... (${allPrices.size}件)`);

      scrollCount++;

      // ページ末尾に到達したか確認
      const currentScrollY = window.scrollY;
      const isAtBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 100);

      if (scrollCount >= maxScrolls || isAtBottom || currentScrollY === lastScrollY) {
        // 収集完了（最大回数、ページ末尾、またはスクロール不可）
        console.log(`[しらべる君 メルカリ] スクロール終了理由: ${scrollCount >= maxScrolls ? '最大回数' : isAtBottom ? 'ページ末尾' : 'スクロール不可'}`);
        finishCollection();
        return;
      }

      lastScrollY = currentScrollY;

      // 下にスクロール
      window.scrollBy(0, window.innerHeight * 0.8);

      // 少し待ってから次の収集
      setTimeout(collectAndScroll, 600);
    };

    const finishCollection = () => {
      // 元の位置に戻る
      window.scrollTo(0, originalScrollY);

      const prices = Array.from(allPrices);
      console.log('[しらべる君 メルカリ] 収集完了:', prices.length, '件');

      if (prices.length > 0) {
        collectedPrices = prices;
        currentSearchKeyword = getSearchKeyword();
        saveAccumulatedData();
      }
      updateStatsDisplay();
    };

    // 少し待ってから開始
    setTimeout(collectAndScroll, 500);
  }

  /**
   * URLから検索キーワードを取得
   */
  function getSearchKeyword() {
    const url = new URL(window.location.href);
    return url.searchParams.get('keyword') || '';
  }

  /**
   * 累積データを保存
   */
  function saveAccumulatedData() {
    chrome.storage.local.set({
      'kuraberu_mercari_prices': collectedPrices,
      'kuraberu_mercari_keyword': currentSearchKeyword,
      'kuraberu_mercari_timestamp': Date.now()
    });
  }

  /**
   * 累積データを読み込み
   */
  async function loadAccumulatedData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['kuraberu_mercari_prices', 'kuraberu_mercari_keyword', 'kuraberu_mercari_timestamp'], (result) => {
        const keyword = getSearchKeyword();
        const savedKeyword = result.kuraberu_mercari_keyword || '';
        const timestamp = result.kuraberu_mercari_timestamp || 0;
        const isRecent = (Date.now() - timestamp) < 30 * 60 * 1000; // 30分以内

        if (savedKeyword === keyword && isRecent && result.kuraberu_mercari_prices) {
          resolve(result.kuraberu_mercari_prices);
        } else {
          resolve([]);
        }
      });
    });
  }

  /**
   * 累積データをクリア
   */
  function clearAccumulatedData() {
    chrome.storage.local.remove(['kuraberu_mercari_prices', 'kuraberu_mercari_keyword', 'kuraberu_mercari_timestamp']);
  }

  /**
   * ページを分析
   */
  function analyzePage(accumulate = false) {
    const newPrices = extractPrices();
    console.log('[しらべる君 メルカリ] 新規価格:', newPrices.length, '件');

    if (accumulate) {
      collectedPrices = [...collectedPrices, ...newPrices];
      saveAccumulatedData();
      showMessage(`➕ ${newPrices.length}件を追加（計${collectedPrices.length}件）`);
    } else {
      collectedPrices = newPrices;
      currentSearchKeyword = getSearchKeyword();
      saveAccumulatedData();
    }

    updateStatsDisplay();
  }

  /**
   * 統計表示を更新
   */
  function updateStatsDisplay() {
    const stats = calculateStats(collectedPrices);
    const statsEl = document.getElementById('kuraberu-mercari-stats');

    if (!statsEl) return;

    if (stats.count === 0) {
      statsEl.innerHTML = `
        <div style="color: #e65100; font-size: 13px;">
          ⚠️ 価格データが見つかりません
        </div>
        <div style="color: #666; font-size: 11px; margin-top: 8px;">
          ページを下にスクロールしてから「次ページ追加」を押してください
        </div>
      `;
      return;
    }

    statsEl.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">件数</div>
          <div style="font-size: 20px; font-weight: 600; color: #333;">${stats.count}</div>
        </div>
        <div style="background: #ffebee; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">平均</div>
          <div style="font-size: 20px; font-weight: 600; color: #d50000;">¥${Math.round(stats.avg).toLocaleString()}</div>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">最安値</div>
          <div style="font-size: 18px; font-weight: 600; color: #2e7d32;">¥${stats.min.toLocaleString()}</div>
        </div>
        <div style="background: #fff3e0; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">最高値</div>
          <div style="font-size: 18px; font-weight: 600; color: #e65100;">¥${stats.max.toLocaleString()}</div>
        </div>
      </div>
      <div style="margin-top: 12px; background: #e3f2fd; padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 11px; color: #666; margin-bottom: 4px;">中央値</div>
        <div style="font-size: 18px; font-weight: 600; color: #0064d2;">¥${Math.round(stats.median).toLocaleString()}</div>
      </div>
      <div style="margin-top: 12px; padding: 10px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px;">
        <div style="font-size: 11px; color: #888; line-height: 1.5;">
          💡 「次ページ追加」でスクロール後の商品も集計できます
        </div>
      </div>
    `;
  }

  /**
   * メッセージを表示
   */
  function showMessage(text) {
    const msgEl = document.getElementById('kuraberu-mercari-message');
    if (msgEl) {
      msgEl.textContent = text;
      setTimeout(() => {
        msgEl.textContent = '';
      }, 3000);
    }
  }

  /**
   * 要素をドラッグ可能にする
   */
  function makeDraggable(element, handle) {
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, initialLeft, initialTop, initialRight;

    handle.style.cursor = 'move';

    handle.addEventListener('mousedown', (e) => {
      if (e.target.id === 'kuraberu-mercari-close') return;

      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.right !== 'auto' && !element.style.left) {
        initialRight = parseInt(computedStyle.right);
        initialTop = parseInt(computedStyle.top);
      } else {
        initialLeft = element.offsetLeft;
        initialTop = element.offsetTop;
        initialRight = null;
      }
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }

      if (initialRight !== null) {
        const newRight = Math.max(0, Math.min(initialRight - dx, window.innerWidth - element.offsetWidth));
        const newTop = Math.max(0, Math.min(initialTop + dy, window.innerHeight - element.offsetHeight));
        element.style.right = `${newRight}px`;
        element.style.top = `${newTop}px`;
        element.style.left = 'auto';
      } else {
        const newLeft = Math.max(0, Math.min(initialLeft + dx, window.innerWidth - element.offsetWidth));
        const newTop = Math.max(0, Math.min(initialTop + dy, window.innerHeight - element.offsetHeight));
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        element.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    return { hasMoved: () => hasMoved };
  }

  /**
   * 分析ボタンを追加
   */
  function addAnalysisButton() {
    // 既にボタンがあれば何もしない
    if (document.querySelector('.kuraberu-mercari-analysis-btn')) {
      return;
    }

    const btn = document.createElement('button');
    btn.className = 'kuraberu-mercari-analysis-btn';
    btn.innerHTML = '📊 価格分析';
    btn.title = 'メルカリ検索結果の価格データを分析します（ドラッグで移動可能）';

    btn.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 9999;
      padding: 12px 20px;
      background: linear-gradient(135deg, #ff5252 0%, #d50000 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: move;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    document.body.appendChild(btn);
    currentButton = btn;

    // ボタンをドラッグ可能に
    const dragState = makeDraggableButton(btn);

    // クリック時の処理（ドラッグと区別）
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragState.hasMoved()) return;

      const isPremium = await checkPremiumStatus();
      if (isPremium) {
        showAnalysisPanel();
      } else {
        showPremiumPrompt();
      }
    });

    console.log('[しらべる君 メルカリ] ボタン追加完了');
  }

  /**
   * ボタン用ドラッグ機能
   */
  function makeDraggableButton(element) {
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, initialRight, initialTop;

    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const computedStyle = window.getComputedStyle(element);
      initialRight = parseInt(computedStyle.right);
      initialTop = parseInt(computedStyle.top);
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }

      const newRight = Math.max(0, Math.min(initialRight - dx, window.innerWidth - element.offsetWidth));
      const newTop = Math.max(0, Math.min(initialTop + dy, window.innerHeight - element.offsetHeight));
      element.style.right = `${newRight}px`;
      element.style.top = `${newTop}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    return { hasMoved: () => hasMoved };
  }

  /**
   * 初期化
   */
  function init() {
    if (!isSearchResultsPage()) {
      console.log('[しらべる君 メルカリ] 検索結果ページではありません');
      return;
    }

    console.log('[しらべる君 メルカリ] 検索結果ページを検出');

    // 少し遅延してからボタンを表示（ページ読み込み完了を待つ）
    setTimeout(() => {
      addAnalysisButton();
    }, 1500);

    // DOM変更を監視（SPA対応）
    const observer = new MutationObserver(() => {
      if (isSearchResultsPage() && !document.querySelector('.kuraberu-mercari-analysis-btn')) {
        addAnalysisButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 初期化実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }

  // URL変更監視（SPA対応）
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('[しらべる君 メルカリ] URL変更検知:', lastUrl);
      if (isSearchResultsPage() && !document.querySelector('.kuraberu-mercari-analysis-btn')) {
        setTimeout(() => {
          addAnalysisButton();
        }, 1500);
      }
    }
  }, 1000);

})();
