/* 2048 核心逻辑自动化测试
 * 运行：node tools/test-logic.js
 * 思路：随机模拟 400 局对局，每步校验不变量 ——
 *   1) 方块总数不超过 16，数值均为 2 的幂
 *   2) 棋盘数字总和恒定不变（合并 2+2=4，总和守恒）
 *   3) moved=true 时：方块减少数 = 合并次数；gained = 所有合并后新方块的数值之和
 *   4) moved=false 时：棋盘与移动前完全一致
 *   5) canMove=false（死局）时，任何方向都必然 moved=false
 */
'use strict';

const g = require('../www/js/game.js');

function boardSum(b) {
  let s = 0;
  for (const row of b) for (const t of row) if (t) s += t.value;
  return s;
}

function tileCount(b) {
  let n = 0;
  for (const row of b) for (const t of row) if (t) n++;
  return n;
}

function isPow2(v) {
  return v > 0 && (v & (v - 1)) === 0;
}

/* 与额外属性（如 merged）无关的确定性序列化 */
function serialize(b) {
  const rows = [];
  for (const row of b) {
    rows.push(row.map((t) => (t ? `${t.id}:${t.r}:${t.c}:${t.value}` : '.')).join('|'));
  }
  return rows.join('/');
}

const DIRS = ['up', 'down', 'left', 'right'];
let failures = 0;
let totalMoves = 0;
let mergesTotal = 0;

function fail(msg, extra) {
  failures++;
  if (failures <= 20) console.error('FAIL:', msg, extra !== undefined ? JSON.stringify(extra) : '');
}

for (let game = 0; game < 400; game++) {
  let board = g.emptyBoard();
  g.addRandomTile(board);
  g.addRandomTile(board);

  for (let step = 0; step < 800; step++) {
    const dir = DIRS[(Math.random() * 4) | 0];
    const sumBefore = boardSum(board);
    const countBefore = tileCount(board);

    const res = g.computeMove(board, dir);
    totalMoves++;

    // 结构检查
    if (tileCount(res.board) > 16) fail('tile count > 16');
    for (const row of res.board)
      for (const t of row)
        if (t && !isPow2(t.value)) fail('non power of 2: ' + t.value);

    // 总和守恒
    if (boardSum(res.board) !== sumBefore) fail('sum not conserved', { sumBefore, after: boardSum(res.board) });

    if (res.moved) {
      if (tileCount(res.board) !== countBefore - res.merges.length)
        fail('merge count mismatch', { countBefore, after: tileCount(res.board), merges: res.merges.length });
      let expectGained = 0;
      for (const m of res.merges) {
        const target = res.board[m.toR][m.toC];
        if (!target) { fail('merge target missing', m); continue; }
        if (target.id === m.id) fail('merge target is the source', m);
        expectGained += target.value;
      }
      if (expectGained !== res.gained) fail('gained mismatch', { expectGained, gained: res.gained });
      mergesTotal += res.merges.length;
    } else {
      if (res.gained !== 0) fail('gained without move');
      if (res.merges.length !== 0) fail('merges without move');
      if (serialize(board) !== serialize(res.board)) fail('board changed without move');
    }

    board = res.board;

    // 死局一致性检查
    if (!g.canMove(board)) {
      for (const d of DIRS) {
        if (g.computeMove(board, d).moved) fail('canMove=false but moved on ' + d);
      }
      break; // 本局自然结束
    }
    g.addRandomTile(board);
  }
}

if (failures === 0) {
  console.log(
    '✅ 全部测试通过：' +
      totalMoves +
      ' 次随机移动，' +
      mergesTotal +
      ' 次合并，所有不变量校验一致'
  );
  process.exit(0);
} else {
  console.error('❌ 共 ' + failures + ' 处失败（仅展示前 20 条）');
  process.exit(1);
}
