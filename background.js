/**
 * くらべる君 - Background Service Worker
 * タブ操作をバックグラウンドで実行
 */

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[くらべる君 BG] メッセージ受信:', request.action);

  if (request.action === 'openTab') {
    // 新しいタブを開く
    chrome.tabs.create({
      url: request.url,
      active: request.active !== false // デフォルトはアクティブ
    }, (tab) => {
      console.log('[くらべる君 BG] タブを開きました:', request.url);
      sendResponse({ success: true, tabId: tab.id });
    });
    return true; // 非同期レスポンス
  }

  if (request.action === 'openInBackground') {
    // バックグラウンドでタブを開く（非アクティブ）
    chrome.tabs.create({
      url: request.url,
      active: false
    }, (tab) => {
      console.log('[くらべる君 BG] バックグラウンドでタブを開きました:', request.url);
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }
});

console.log('[くらべる君 BG] Background Service Worker 起動');
