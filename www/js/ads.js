/* ============================================================
 * AdMob 广告接入（插屏 + 激励视频）
 * - 浏览器/网页环境自动停用，对游戏逻辑零影响
 * - 默认使用 Google 官方测试广告 ID，装上即可看到测试广告
 * - 正式上架前：替换 CONFIG 为真实 ID，并把 TEST_MODE 改为 false
 * ============================================================ */
(function () {
  'use strict';

  // ===== 上线前修改这里（详见 README「广告变现」一节）=====
  var TEST_MODE = true; // 开发期 true（展示测试广告）；正式上线改 false
  var CONFIG = {
    ios: {
      appId: 'ca-app-pub-3940256099942544~1458002511',       // Google 测试 App ID → 换成你的
      interstitial: 'ca-app-pub-3940256099942544/441146891', // 测试插屏广告位 → 换成你的
      rewarded: 'ca-app-pub-3940256099942544/1717015284'     // 测试激励广告位 → 换成你的
    },
    android: {
      appId: 'ca-app-pub-3940256099942544~3347511713',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
      rewarded: 'ca-app-pub-3940256099942544/5224354917'
    }
  };

  // 插屏频率控制（过低频违反体验、过高频违反商店政策）：
  // 每 2 次游戏结束最多展示 1 次，且两次间隔至少 90 秒，仅在死亡结算时弹出
  var INTERSTITIAL_EVERY = 2;
  var INTERSTITIAL_MIN_GAP = 90 * 1000;

  var AdMob = null;
  var conf = null;
  var ready = false;
  var interstitialReady = false;
  var rewardedReady = false;
  var gameOverCount = 0;
  var lastInterstitialAt = 0;

  function isNative() {
    return !!(window.Capacitor &&
      window.Capacitor.isNativePlatform &&
      window.Capacitor.isNativePlatform());
  }

  function preload() {
    if (!ready) return;
    AdMob.prepareInterstitial({ adId: conf.interstitial })
      .then(function () { interstitialReady = true; })
      .catch(function () { interstitialReady = false; });
    AdMob.prepareRewardVideoAd({ adId: conf.rewarded })
      .then(function () { rewardedReady = true; })
      .catch(function () { rewardedReady = false; });
  }

  var Ads = {
    init: function () {
      if (!isNative() || ready) return;
      try {
        AdMob = window.Capacitor.Plugins.AdMob;
        if (!AdMob) return;
        var platform = window.Capacitor.getPlatform();
        conf = platform === 'ios' ? CONFIG.ios : CONFIG.android;
        AdMob.initialize({
          requestTrackingAuthorization: true, // iOS 弹 ATT 授权（拒绝则展示非个性化广告）
          initializeForTesting: TEST_MODE
        }).then(function () {
          ready = true;
          preload();
        }).catch(function () { ready = false; });
      } catch (e) {
        ready = false;
      }
    },

    /* 游戏结束时调用：返回 true 表示本次应展示插屏 */
    shouldShowInterstitial: function () {
      if (!ready || !interstitialReady) return false;
      gameOverCount++;
      return gameOverCount % INTERSTITIAL_EVERY === 0 &&
        (Date.now() - lastInterstitialAt) > INTERSTITIAL_MIN_GAP;
    },

    showInterstitial: function (onClose) {
      if (!ready || !interstitialReady) {
        if (onClose) onClose();
        return;
      }
      lastInterstitialAt = Date.now();
      AdMob.showInterstitial()
        .then(function () { preload(); if (onClose) onClose(); })
        .catch(function () { preload(); if (onClose) onClose(); });
    },

    /* 激励视频是否可用（可用时游戏结束层显示“看广告复活”按钮） */
    canRevive: function () {
      return ready && rewardedReady;
    },

    /* 看完广告 → onReward()；中途关闭/加载失败 → onDismiss() */
    showRewarded: function (onReward, onDismiss) {
      if (!ready || !rewardedReady) {
        if (onDismiss) onDismiss();
        return;
      }
      AdMob.showRewardVideoAd()
        .then(function () {
          rewardedReady = false;
          preload();
          if (onReward) onReward();
        })
        .catch(function () {
          rewardedReady = false;
          preload();
          if (onDismiss) onDismiss();
        });
    },

    /* “再来一局”统一入口：按频率规则决定是否先看插屏 */
    gateNewGame: function (startNewGame) {
      if (this.shouldShowInterstitial()) {
        this.showInterstitial(startNewGame);
      } else {
        startNewGame();
      }
    }
  };

  window.Ads = Ads;
})();
