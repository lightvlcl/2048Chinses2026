/* ============================================================
 * 2048 · 数字消除
 * 纯逻辑层 + 界面交互层
 * 逻辑层可在 Node 环境独立测试（node tools/test-logic.js）
 * ============================================================ */
(function () {
  'use strict';

  var SIZE = 4;
  var tileId = 0;

  /* ======================= 纯逻辑层 ======================= */

  function emptyBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) row.push(null);
      b.push(row);
    }
    return b;
  }

  function emptyCells(board) {
    var cells = [];
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (!board[r][c]) cells.push({ r: r, c: c });
    return cells;
  }

  function makeTile(r, c, value) {
    return { id: ++tileId, r: r, c: c, value: value };
  }

  function addRandomTile(board) {
    var cells = emptyCells(board);
    if (cells.length === 0) return null;
    var cell = cells[Math.floor(Math.random() * cells.length)];
    var tile = makeTile(cell.r, cell.c, Math.random() < 0.9 ? 2 : 4);
    board[cell.r][cell.c] = tile;
    return tile;
  }

  var VEC = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

  function traversal(dir) {
    var rows = [0, 1, 2, 3];
    var cols = [0, 1, 2, 3];
    if (dir === 'down') rows.reverse();
    if (dir === 'right') cols.reverse();
    return { rows: rows, cols: cols };
  }

  /**
   * 计算一次移动（不修改原棋盘）。
   * 返回 { board, moved, gained, merges }
   * merges: [{ id, fromR, fromC, toR, toC }] —— 被合并消失的方块及其去向。
   */
  function computeMove(board, dir) {
    var nb = emptyBoard();
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        nb[r][c] = board[r][c]
          ? { id: board[r][c].id, r: r, c: c, value: board[r][c].value, merged: false }
          : null;

    var t = traversal(dir);
    var vec = VEC[dir];
    var moved = false;
    var gained = 0;
    var merges = [];

    for (var i = 0; i < SIZE; i++) {
      for (var j = 0; j < SIZE; j++) {
        var row = t.rows[i];
        var col = t.cols[j];
        var tile = nb[row][col];
        if (!tile) continue;

        var cr = row, cc = col;
        for (;;) {
          var nr = cr + vec[0];
          var nc = cc + vec[1];
          if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
          if (nb[nr][nc]) {
            var other = nb[nr][nc];
            if (other.value === tile.value && !other.merged) {
              other.value *= 2;
              other.merged = true;
              gained += other.value;
              nb[row][col] = null;
              merges.push({ id: tile.id, fromR: tile.r, fromC: tile.c, toR: nr, toC: nc });
              moved = true;
            }
            break;
          }
          cr = nr;
          cc = nc;
        }

        if (nb[row][col] === tile && (cr !== row || cc !== col)) {
          nb[row][col] = null;
          tile.r = cr;
          tile.c = cc;
          nb[cr][cc] = tile;
          moved = true;
        }
      }
    }
    return { board: nb, moved: moved, gained: gained, merges: merges };
  }

  function canMove(board) {
    if (emptyCells(board).length > 0) return true;
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        var v = board[r][c].value;
        if (r + 1 < SIZE && board[r + 1][c].value === v) return true;
        if (c + 1 < SIZE && board[r][c + 1].value === v) return true;
      }
    return false;
  }

  function maxValue(board) {
    var m = 0;
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (board[r][c] && board[r][c].value > m) m = board[r][c].value;
    return m;
  }

  /* Node 导出：仅供自动化测试，浏览器环境不会执行到这里 */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      SIZE: SIZE,
      emptyBoard: emptyBoard,
      addRandomTile: addRandomTile,
      computeMove: computeMove,
      canMove: canMove,
      maxValue: maxValue
    };
    return;
  }

  /* ======================= 界面交互层 ======================= */

  var boardEl = document.getElementById('board');
  var tilesEl = document.getElementById('tiles');
  var cellsEl = document.getElementById('cells');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var scoreBoxEl = document.getElementById('score-box');
  var undoBtn = document.getElementById('undo');
  var newGameBtn = document.getElementById('new-game');
  var overlayEl = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlay-title');
  var overlayTextEl = document.getElementById('overlay-text');
  var overlayBtn = document.getElementById('overlay-btn');
  var overlayBtn2 = document.getElementById('overlay-btn2');

  var STORAGE_STATE = 'g2048_state';
  var STORAGE_BEST = 'g2048_best';

  var board, score, best, hasWon, busy, history, tileEls, storageOk, newRecordFlag;

  /* ---------- 工具 ---------- */

  function layout() {
    var w = boardEl.clientWidth;
    if (!w) return;
    var gap = Math.max(8, Math.round(w * 0.026));
    var ts = Math.floor((w - gap * 5) / 4);
    boardEl.style.setProperty('--gap', gap + 'px');
    boardEl.style.setProperty('--ts', ts + 'px');
  }

  function valueClass(v) {
    var known = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
    if (known.indexOf(v) >= 0) return 't' + v;
    return 'tsuper';
  }

  function digitClass(v) {
    var n = String(v).length;
    if (n >= 5) return 'd5';
    if (n === 4) return 'd4';
    if (n === 3) return 'd3';
    return '';
  }

  function innerClass(v, extra) {
    var cls = 'tile-inner ' + valueClass(v);
    var d = digitClass(v);
    if (d) cls += ' ' + d;
    if (extra) cls += ' ' + extra;
    return cls;
  }

  function setPos(el, r, c) {
    el.style.setProperty('--r', String(r));
    el.style.setProperty('--c', String(c));
  }

  function makeTileEl(tile, spawn) {
    var el = document.createElement('div');
    el.className = 'tile';
    setPos(el, tile.r, tile.c);
    var inner = document.createElement('div');
    inner.className = innerClass(tile.value, spawn ? 'spawn' : '');
    inner.textContent = String(tile.value);
    el.appendChild(inner);
    tilesEl.appendChild(el);
    tileEls[tile.id] = { el: el, inner: inner };
  }

  function renderBackgroundCells() {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        setPos(cell, r, c);
        cellsEl.appendChild(cell);
      }
  }

  function buildFromValues(values) {
    board = emptyBoard();
    tilesEl.innerHTML = '';
    tileEls = {};
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        var v = Math.max(0, Number(values[r][c]) || 0);
        if (v > 0) {
          var t = makeTile(r, c, v);
          board[r][c] = t;
          makeTileEl(t, false);
        }
      }
  }

  /* ---------- 计分 ---------- */

  function updateScoreUI(delta) {
    scoreEl.textContent = String(score);
    if (delta > 0) {
      var f = document.createElement('span');
      f.className = 'score-float';
      f.textContent = '+' + delta;
      scoreBoxEl.appendChild(f);
      window.setTimeout(function () {
        if (f.parentNode) f.parentNode.removeChild(f);
      }, 750);
    }
    if (score > best) {
      best = score;
      newRecordFlag = true;
      bestEl.textContent = String(best);
      if (storageOk) {
        try { window.localStorage.setItem(STORAGE_BEST, String(best)); } catch (e) {}
      }
    }
  }

  /* ---------- 存档 ---------- */

  function snapshotValues() {
    var values = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) row.push(board[r][c] ? board[r][c].value : 0);
      values.push(row);
    }
    return values;
  }

  function saveState() {
    if (!storageOk) return;
    try {
      window.localStorage.setItem(
        STORAGE_STATE,
        JSON.stringify({ values: snapshotValues(), score: score, hasWon: hasWon })
      );
    } catch (e) {}
  }

  function loadState() {
    if (!storageOk) return null;
    try {
      var s = JSON.parse(window.localStorage.getItem(STORAGE_STATE));
      if (s && Array.isArray(s.values) && s.values.length === SIZE) return s;
    } catch (e) {}
    return null;
  }

  /* ---------- 撤销 ---------- */

  function snapshot() {
    history.push({ values: snapshotValues(), score: score });
    if (history.length > 20) history.shift();
    undoBtn.disabled = false;
  }

  function undo() {
    if (busy || history.length === 0) return;
    var s = history.pop();
    undoBtn.disabled = history.length === 0;
    score = s.score;
    buildFromValues(s.values);
    hasWon = maxValue(board) >= 2048;
    hideOverlay();
    updateScoreUI(0);
    saveState();
  }

  /* ---------- 移动 ---------- */

  function move(dir) {
    if (busy) return;
    var result = computeMove(board, dir);
    if (!result.moved) {
      boardEl.classList.remove('shake');
      void boardEl.offsetWidth; // 重新触发动画
      boardEl.classList.add('shake');
      return;
    }

    busy = true;
    snapshot();
    board = result.board;

    var i, m, rec;

    // 被合并的方块滑向目标位置
    for (i = 0; i < result.merges.length; i++) {
      m = result.merges[i];
      rec = tileEls[m.id];
      if (rec) setPos(rec.el, m.toR, m.toC);
    }
    // 存活方块滑到新位置
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        var t = board[r][c];
        if (!t) continue;
        rec = tileEls[t.id];
        if (rec) setPos(rec.el, r, c);
      }

    score += result.gained;
    updateScoreUI(result.gained);

    window.setTimeout(function () {
      // 移除被合并的方块，更新目标方块的数值并弹跳
      for (i = 0; i < result.merges.length; i++) {
        m = result.merges[i];
        var dead = tileEls[m.id];
        if (dead) {
          if (dead.el.parentNode) dead.el.parentNode.removeChild(dead.el);
          delete tileEls[m.id];
        }
      }
      for (i = 0; i < result.merges.length; i++) {
        m = result.merges[i];
        var target = board[m.toR][m.toC];
        var rec3 = tileEls[target.id];
        if (rec3) {
          rec3.inner.className = innerClass(target.value, 'merge-pop');
          rec3.inner.textContent = String(target.value);
        }
      }

      var nt = addRandomTile(board);
      if (nt) makeTileEl(nt, true);

      saveState();
      busy = false;

      if (!hasWon && maxValue(board) >= 2048) {
        hasWon = true;
        showWin();
      } else if (!canMove(board)) {
        showGameOver();
      }
    }, 140);
  }

  /* ---------- 覆盖层 ---------- */

  function showOverlay(title, text, primaryLabel, secondaryLabel, onPrimary, onSecondary) {
    overlayTitleEl.textContent = title;
    overlayTextEl.textContent = text;
    overlayBtn.textContent = primaryLabel;
    overlayBtn2.textContent = secondaryLabel || '';
    overlayBtn2.classList.toggle('hidden', !secondaryLabel);
    overlayBtn.onclick = onPrimary;
    overlayBtn2.onclick = onSecondary;
    overlayEl.classList.remove('hidden');
  }

  function hideOverlay() {
    overlayEl.classList.add('hidden');
  }

  function showWin() {
    showOverlay(
      '🎉 你赢了！',
      '成功合成 2048，当前分数 ' + score,
      '继续挑战',
      '新游戏',
      function () { hideOverlay(); },
      function () { newGame(); }
    );
  }

  /* “再来一局”统一入口：按频率规则可能先展示插屏广告 */
  function newGameFromOverlay() {
    if (window.Ads) {
      window.Ads.gateNewGame(newGame);
    } else {
      newGame();
    }
  }

  /* 看激励广告复活：随机移除一个方块腾出空间，游戏继续 */
  function reviveWithAd() {
    window.Ads.showRewarded(function () {
      var cells = [];
      for (var r = 0; r < SIZE; r++)
        for (var c = 0; c < SIZE; c++)
          if (board[r][c]) cells.push({ r: r, c: c });
      if (cells.length > 0) {
        var cell = cells[Math.floor(Math.random() * cells.length)];
        var t = board[cell.r][cell.c];
        board[cell.r][cell.c] = null;
        var rec = tileEls[t.id];
        if (rec && rec.el.parentNode) rec.el.parentNode.removeChild(rec.el);
        delete tileEls[t.id];
      }
      hideOverlay();
      saveState();
    }, function () {
      showGameOver(); // 未获得奖励（中途关闭/加载失败），重新显示结束层
    });
  }

  function showGameOver() {
    var revive = !!(window.Ads && window.Ads.canRevive());
    showOverlay(
      '游戏结束',
      '最终得分 ' + score + (newRecordFlag && score > 0 ? '（新纪录！）' : ''),
      revive ? '▶️ 看广告复活' : '再来一局',
      revive ? '再来一局' : null,
      revive ? reviveWithAd : newGameFromOverlay,
      revive ? newGameFromOverlay : null
    );
    newRecordFlag = false;
  }

  /* ---------- 新游戏 ---------- */

  function newGame() {
    history = [];
    undoBtn.disabled = true;
    score = 0;
    hasWon = false;
    newRecordFlag = false;
    board = emptyBoard();
    tilesEl.innerHTML = '';
    tileEls = {};
    addRandomTile(board);
    addRandomTile(board);
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (board[r][c]) makeTileEl(board[r][c], true);
    hideOverlay();
    updateScoreUI(0);
    saveState();
  }

  /* ---------- 输入：键盘 ---------- */

  var KEY_MAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };

  document.addEventListener('keydown', function (e) {
    var dir = KEY_MAP[e.key];
    if (dir) {
      e.preventDefault();
      move(dir);
    }
  });

  /* ---------- 输入：触屏滑动 ---------- */

  var touchId = null, tx = 0, ty = 0;

  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touchId = null; return; }
    var t = e.touches[0];
    touchId = t.identifier;
    tx = t.clientX;
    ty = t.clientY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (touchId === null) return;
    var t = null;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) { t = e.changedTouches[i]; break; }
    }
    touchId = null;
    if (!t) return;
    var dx = t.clientX - tx;
    var dy = t.clientY - ty;
    var ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 24) return; // 视为点击
    move(ax > ay ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });

  // 防止在棋盘上滑动时拖动页面
  boardEl.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

  /* ---------- 初始化 ---------- */

  storageOk = true;
  try {
    window.localStorage.setItem('__t', '1');
    window.localStorage.removeItem('__t');
  } catch (e) { storageOk = false; }

  best = 0;
  if (storageOk) best = parseInt(window.localStorage.getItem(STORAGE_BEST) || '0', 10) || 0;
  bestEl.textContent = String(best);

  history = [];
  busy = false;
  tileEls = {};
  newRecordFlag = false;
  board = emptyBoard();

  newGameBtn.addEventListener('click', newGame);
  undoBtn.addEventListener('click', undo);
  if (window.Ads) window.Ads.init(); // 原生环境初始化 AdMob（浏览器自动跳过）

  /* ---------- 名景背景切换 ---------- */

  var bgBtn = document.getElementById('bg-btn');

  var SCENES = [
    { name: '桂林', file: 'img/bg-guilin.jpg' },
    { name: '长城', file: 'img/bg-wall.jpg' },
    { name: '西湖', file: 'img/bg-westlake.jpg' },
    { name: '黄山', file: 'img/bg-huangshan.jpg' },
    { name: '夜空', file: '' } // 原深色渐变，不加载图片
  ];

  var bgIndex = 0;
  if (storageOk) bgIndex = parseInt(window.localStorage.getItem('g2048_bg') || '0', 10) || 0;
  if (bgIndex < 0 || bgIndex >= SCENES.length) bgIndex = 0;

  function applyBg() {
    document.body.setAttribute('data-bg', String(bgIndex));
    document.body.setAttribute('data-photo', bgIndex < SCENES.length - 1 ? '1' : '0');
    bgBtn.textContent = '🏞️ ' + SCENES[bgIndex].name;
    if (storageOk) {
      try { window.localStorage.setItem('g2048_bg', String(bgIndex)); } catch (e) {}
    }
  }

  bgBtn.addEventListener('click', function () {
    bgIndex = (bgIndex + 1) % SCENES.length;
    applyBg();
  });
  applyBg();

  // 空闲时预加载其余背景，切换零等待
  window.addEventListener('load', function () {
    for (var i = 0; i < SCENES.length; i++) {
      if (SCENES[i].file) {
        var im = new Image();
        im.src = SCENES[i].file;
      }
    }
  });

  renderBackgroundCells();
  layout();

  var saved = loadState();
  if (saved) {
    buildFromValues(saved.values);
    score = saved.score || 0;
    hasWon = !!saved.hasWon || maxValue(board) >= 2048;
    updateScoreUI(0);
    if (!canMove(board)) showGameOver();
  } else {
    newGame();
  }

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
})();
