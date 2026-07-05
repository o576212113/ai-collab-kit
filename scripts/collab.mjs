#!/usr/bin/env node
/**
 * ai-collab-kit 中控脚本(零依赖,Node >= 16)
 *
 * 用法:
 *   node collab.mjs init                     在当前 git 仓库初始化 _collab/ 总线
 *   node collab.mjs status                   汇报当前协作状态(只报机械字段)
 *   node collab.mjs mode <m> [--lean]        切模式(review|discussion|execution|idle)
 *   node collab.mjs topic <slug> [--from f] [--lite]  启动新议题(T-NNN 自动编号;--lite 只走 R1)
 *   node collab.mjs advance [--commit]       议事环:检查产物齐否并推进 phase(机械收敛判定)
 *   node collab.mjs next                     输出可粘贴的下一步指令(该贴给哪个窗口)
 *   node collab.mjs decision --from f        Owner 拍板机械誊录 owner_decision.md + 议题收口
 *   node collab.mjs decide "<决策>"          决策账本入账(机械誊录 Owner 拍板,D-NNN 自动编号)
 *   node collab.mjs proposals                列出实战沉淀的硬升级候选(Owner 逐条采纳/驳回)
 *   node collab.mjs check [--commit-msg f]   健康检查 / commit 写权限机检(hook 用)
 *   node collab.mjs archive                  归档 review/state.json 中的非活跃字段
 *   node collab.mjs install-hook             安装 commit-msg 机检 hook
 *
 * 设计原则(见 PROTOCOL.md):中控只做机械事——查文件齐否、grep 机械字段、
 * 推进枚举值、报路径。本脚本绝不加工/总结任何一方的观点正文。
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const cmd = args[0];

// ---------- 基础工具 ----------
function git(args_, opts = {}) {
  return execSync(`git ${args_}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}
function gitRoot() {
  try { return git('rev-parse --show-toplevel'); }
  catch { die('当前目录不在 git 仓库内。请在目标项目仓库根目录运行。'); }
}
function die(msg, code = 1) { console.error(`[collab] ✗ ${msg}`); process.exit(code); }
function ok(msg) { console.log(`[collab] ✓ ${msg}`); }
function info(msg) { console.log(`[collab] ${msg}`); }
function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) {
    if (e.code === 'ENOENT') die(`未找到 ${norm(p)} —— 是否还没运行 init?`);
    die(`${norm(p)} JSON 解析失败:${e.message}`);
  }
}
function writeJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
function nowISO() { return new Date().toISOString(); }
function norm(p) { return p.replace(/\\/g, '/'); }
function roleCN(r) { return r === 'reviewer' ? '审核员(Reviewer)' : '开发员(Writer)'; }
function other(r) { return r === 'reviewer' ? 'writer' : 'reviewer'; }

function loadCtx() {
  const root = gitRoot();
  let busName = '_collab';
  const cfgPath = path.join(root, busName, 'collab.config.json');
  let config = null;
  if (fs.existsSync(cfgPath)) {
    config = readJSON(cfgPath);
    busName = config.bus_dir || busName;
  }
  const bus = path.join(root, busName);
  return { root, bus, busName, config };
}

// ---------- init ----------
function cmdInit() {
  const root = gitRoot();
  const bus = path.join(root, '_collab');
  const T = path.join(KIT_DIR, 'templates');
  const plan = [
    ['collab.config.json', path.join(KIT_DIR, 'config', 'collab.config.json')],
    ['escalation_rules.md', path.join(KIT_DIR, 'config', 'escalation_rules.md')],
    ['mode.json', path.join(T, 'mode.json')],
    [path.join('review', 'state.json'), path.join(T, 'state.review.json')],
    [path.join('review', 'last_writer.md'), path.join(T, 'last_writer.md')],
    [path.join('review', 'last_reviewer.md'), path.join(T, 'last_reviewer.md')],
    [path.join('discussion', 'state.json'), path.join(T, 'state.discussion.json')],
    ['escalation_candidates.md', path.join(T, 'escalation_candidates.md')],
    ['locked_decisions.md', path.join(T, 'locked_decisions.md')],
  ];
  fs.mkdirSync(path.join(bus, 'review', 'archive'), { recursive: true });
  fs.mkdirSync(path.join(bus, 'discussion', 'topics'), { recursive: true });
  let created = 0, skipped = 0;
  for (const [rel, src] of plan) {
    const dst = path.join(bus, rel);
    if (fs.existsSync(dst)) { info(`  跳过(已存在):${norm(path.relative(root, dst))}`); skipped++; continue; }
    fs.copyFileSync(src, dst);
    ok(`  创建:${norm(path.relative(root, dst))}`);
    created++;
  }
  info('');
  ok(`init 完成:${created} 个文件创建,${skipped} 个跳过。`);
  info('下一步:');
  info('  1. 编辑 _collab/collab.config.json(角色→工具映射、验证链命令)');
  info('  2. 编辑 _collab/escalation_rules.md(本项目"AI 不许拍板"清单)');
  info('  3. 把 adapters/ 里对应工具的片段贴进各工具的指令文件(CLAUDE.md / AGENTS.md 等)');
  info('  4. 可选:node collab.mjs install-hook 启用 commit 写权限机检');
}

// ---------- status ----------
function cmdStatus() {
  const { root, bus, config } = loadCtx();
  const perUnit = (config?.loops?.review?.deadlock_per_unit) ?? 3;
  const perGate = (config?.loops?.review?.deadlock_per_gate) ?? 2;
  const modeP = path.join(bus, 'mode.json');
  if (!fs.existsSync(modeP)) die('未找到 _collab/mode.json,先运行 init。');
  const mode = readJSON(modeP);
  console.log('─'.repeat(52));
  console.log(`模式:${mode.mode}${mode.lean ? '(lean,中控挂起)' : ''}`);
  console.log(`活跃任务:${mode.active_task_id ?? '无'}`);
  console.log(`最后更新:${mode.updated_by || '?'} @ ${mode.updated_at || '?'}`);

  const rP = path.join(bus, 'review', 'state.json');
  if (fs.existsSync(rP)) {
    const r = readJSON(rP);
    console.log('─'.repeat(52));
    console.log('审稿环:');
    console.log(`  单元:${r.unit_id ?? '无'}  round ${r.round} / attempt ${r.attempt}`);
    console.log(`  待审 target:${r.review_target_commit ?? '无'}`);
    console.log(`  审稿结论:${r.review_status ?? '无'}(last_reviewed: ${r.last_reviewed_commit ?? '无'})`);
    console.log(`  next_action:${r.next_action}`);
    const d = r.deadlock || {};
    if (d.blocked) console.log('  ⚠️ DEADLOCK-BLOCKED:等 Owner 裁断');
    else if (d.unit_rejections > 0) console.log(`  死锁计数:unit ${d.unit_rejections}/${perUnit}(gate 阈值 ${perGate});gates ${JSON.stringify(d.gate_counters || {})}`);
  }

  const dP = path.join(bus, 'discussion', 'state.json');
  if (fs.existsSync(dP)) {
    const s = readJSON(dP);
    console.log('─'.repeat(52));
    console.log('议事环:');
    console.log(`  议题:${s.topic_id ?? '无'}  phase:${s.phase}  round:${s.round}`);
    console.log(`  decision_authority:${s.decision_authority ?? '未定'}`);
    console.log(`  next_action:${s.next_action}`);
    if (s.topic_id) {
      const tDir = path.join(bus, 'discussion', 'topics', s.topic_id);
      if (fs.existsSync(tDir)) {
        console.log('  产物文件:');
        for (const f of fs.readdirSync(tDir).sort()) console.log(`    - ${norm(path.relative(root, path.join(tDir, f)))}`);
      }
    }
  }
  console.log('─'.repeat(52));
}

// ---------- mode ----------
function cmdMode() {
  const target = args[1];
  const valid = ['review', 'discussion', 'execution', 'idle'];
  if (!valid.includes(target)) die(`用法:mode <${valid.join('|')}> [--lean]`);
  const { bus } = loadCtx();
  if (!fs.existsSync(bus)) die('未找到协作总线目录,先运行 init。');
  const p = path.join(bus, 'mode.json');
  const mode = fs.existsSync(p) ? readJSON(p) : readJSON(path.join(KIT_DIR, 'templates', 'mode.json'));
  mode.mode = target;
  mode.lean = args.includes('--lean');
  mode.orchestrator_suspended = mode.lean;
  if (target === 'idle') { mode.active_task_id = null; mode.lean = false; mode.orchestrator_suspended = false; }
  mode.updated_by = 'collab.mjs';
  mode.updated_at = nowISO();
  writeJSON(p, mode);
  ok(`mode → ${target}${mode.lean ? '(lean)' : ''}`);
  info('提醒:切模式应出自 Owner 明确指令(PROTOCOL §四)。');
}

// ---------- topic ----------
function cmdTopic() {
  const slug = args[1];
  if (!slug || slug.startsWith('--')) die('用法:topic <slug> [--from <owner原文文件>]');
  if (!/^[A-Za-z0-9一-龥_-]+$/.test(slug)) die('slug 只允许字母/数字/中文/下划线/连字符(不允许 / \\ . 空格等,防目录逃逸与机检失配)');
  const { root, bus } = loadCtx();
  if (!fs.existsSync(bus)) die('未找到协作总线目录,先运行 init。');
  const topicsDir = path.join(bus, 'discussion', 'topics');
  fs.mkdirSync(topicsDir, { recursive: true });
  let maxN = 0;
  for (const d of fs.readdirSync(topicsDir)) {
    const m = d.match(/^T-(\d+)/);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  const id = `T-${String(maxN + 1).padStart(3, '0')}-${slug}`;
  const tDir = path.join(topicsDir, id);
  fs.mkdirSync(tDir, { recursive: true });

  let ownerText = '<Owner 输入原文,一字不改复制。Owner 想加背景请自己写在这里。>';
  const fromIdx = args.indexOf('--from');
  if (fromIdx > -1 && args[fromIdx + 1]) ownerText = fs.readFileSync(args[fromIdx + 1], 'utf8').trim();

  // replacement 一律用函数形式,防 Owner 原文中的 $&、$` 等被 replace 特殊模式解释(铁律:原文一字不改)
  let tpl = fs.readFileSync(path.join(KIT_DIR, 'templates', 'topic.md'), 'utf8');
  tpl = tpl
    .replace(/^# T-NNN — <slug>/m, () => `# ${id}`)
    .replace('<Owner 输入原文,一字不改复制。Owner 想加背景请自己写在这里。>', () => ownerText)
    .replace('topic_id: T-NNN-<slug>', () => `topic_id: ${id}`)
    .replace('启动时间: <ISO 8601>', () => `启动时间: ${nowISO()}`);
  fs.writeFileSync(path.join(tDir, 'topic.md'), tpl, 'utf8');

  const sP = path.join(bus, 'discussion', 'state.json');
  const s = fs.existsSync(sP) ? readJSON(sP) : readJSON(path.join(KIT_DIR, 'templates', 'state.discussion.json'));
  s.topic_id = id; s.phase = 'parallel_draft_round_1'; s.round = 1;
  s.decision_authority = null;
  s.lite = args.includes('--lite');
  // 起草权轮换(公正性):单数议题开发员起草 synthesis,双数议题审核员起草
  s.synthesis_author = ((maxN + 1) % 2 === 1) ? 'writer' : 'reviewer';
  s.next_action = 'wait_for_both_round_1_drafts';
  s.updated_by = 'collab.mjs'; s.updated_at = nowISO();
  writeJSON(sP, s);

  const mP = path.join(bus, 'mode.json');
  const mode = fs.existsSync(mP) ? readJSON(mP) : readJSON(path.join(KIT_DIR, 'templates', 'mode.json'));
  mode.mode = 'discussion'; mode.active_task_id = id;
  mode.updated_by = 'collab.mjs'; mode.updated_at = nowISO();
  writeJSON(mP, mode);

  ok(`议题已启动:${id}${s.lite ? '(lite 轻量档:只走 R1,不进 R2)' : ''}`);
  info(`  - ${norm(path.relative(root, path.join(tDir, 'topic.md')))}(请人工核对 Owner 原文与硬升级筛查表)`);
  info(`  - phase = parallel_draft_round_1,等双方盲发 R1 draft;synthesis 起草权(轮换):${roleCN(s.synthesis_author)}`);
  info(`  建议 commit:discuss(topic): ${id} 启动 [skip-review]`);
  info('');
  info('📝 好议题三要素(AI 不会替你补,缺了产出就模糊——建议都写进原文):');
  info('   ① 背景:为什么现在议这个  ② 边界:什么不许动  ③ 纠结点:你在 A 和 B 之间摇摆什么');
  info('   需要补充就直接编辑 topic.md 的"Owner 议题原文"段(仍须是你的原话)。');
}

// ---------- next(输出可粘贴的下一步指令,Owner 纯复制转达) ----------
function cmdNext() {
  const { root, bus } = loadCtx();
  const mode = readJSON(path.join(bus, 'mode.json'));
  const paste = (win, text) => {
    console.log(`── 贴给${win}窗口 ──`);
    console.log(`“${text}”`);
    console.log('');
  };
  if (mode.mode === 'discussion') {
    const s = readJSON(path.join(bus, 'discussion', 'state.json'));
    const id = mode.active_task_id;
    if (!id) return info('无活跃议题。用 topic <slug> --from <原文文件> 启动。');
    const tDir = path.join(bus, 'discussion', 'topics', id);
    const has = (n) => fs.existsSync(path.join(tDir, n));
    const draftTip = '末尾带:人话摘要 + 收敛信号 footer + 假设声明段;盲发阶段禁读对方文件';
    const respTip = '末尾带:人话摘要 + 收敛信号 footer(agree 必填 concession:让了什么步)';
    const m = s.phase.match(/^(parallel_draft|cross_response)_round_(\d)$/);
    if (m) {
      const kind = m[1] === 'parallel_draft' ? 'draft' : 'response';
      const tip = kind === 'draft' ? draftTip : respTip;
      for (const side of ['writer', 'reviewer']) {
        if (!has(`${side}_r${m[2]}_${kind}.md`)) paste(roleCN(side), `继续议事 ${id}:当前 phase=${s.phase},写 ${side}_r${m[2]}_${kind}.md(${tip}),commit+push`);
      }
      return;
    }
    if (s.phase === 'lite_synthesis' || s.phase === 'converged' || s.phase === 'escalated_owner') {
      if (!has('synthesis.md')) return paste(roleCN(s.synthesis_author), `继续议事 ${id}:起草 synthesis.md(顶部 5 行决策摘要;phase=${s.phase}),commit+push`);
      const text = fs.readFileSync(path.join(tDir, 'synthesis.md'), 'utf8');
      if (!/(writer|reviewer)_ack:\s*(ack_with_amendments|ack|disagree)/i.test(text)) {
        return paste(roleCN(other(s.synthesis_author)), `继续议事 ${id}:复核 synthesis.md(结构化三问 + 填 ${other(s.synthesis_author)}_ack 字段),commit+push`);
      }
      return info(`等 Owner 拍板:把原话存文件后跑 decision --from <文件>(synthesis 见 ${norm(path.relative(root, path.join(tDir, 'synthesis.md')))})`);
    }
    return info(`phase=${s.phase},先跑 advance 判定。`);
  }
  const rP = path.join(bus, 'review', 'state.json');
  if (fs.existsSync(rP)) {
    const r = readJSON(rP);
    const na = r.next_action || '';
    if (/^wait_for_reviewer/.test(na)) return paste('审核员(Reviewer)', `pull 后审 _collab/review/state.json 指向的待审 commit(单元 ${r.unit_id ?? '?'}),结论写 last_reviewer.md(冻结 hash),commit 带 [skip-review] 后 push`);
    if (/^writer_fix/.test(na)) return paste('开发员(Writer)', `pull 后亲读 _collab/review/last_reviewer.md 原文,逐条整改(反审表带验证证据),修完按协议重新交审`);
    if (/^writer_proceed/.test(na)) return paste('开发员(Writer)', `上一单元已 APPROVED,按计划进入下一单元(有硬停点先等 Owner 授权)`);
    if (/^owner_decision/.test(na)) return info(`等 Owner 拍板:${na}(详见 last_reviewer.md)`);
    return info(`next_action=${na || '(空)'};mode=${mode.mode}。无明确待转达项。`);
  }
  info(`mode=${mode.mode},无待转达项。`);
}

// ---------- advance(议事环机械推进) ----------
function parseSignals(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sig = (text.match(/convergence_signal:\s*(agree|disagree)/i) || [])[1]?.toLowerCase() ?? null;
  const hard = (text.match(/hard_escalation_topic:\s*(true|false)/i) || [])[1]?.toLowerCase() ?? null;
  // 摘要段标题是机械字面量(中文"人话摘要"或英文 "Owner Summary"),产物语言无论中英都不得改成别的措辞
  const summary = /(人话摘要|owner\s+summary)/i.test(text);
  // concession:agree 时必填"我放弃/接受了什么"——防懒惰同意;占位符/null 不算填了
  const rawConcession = (text.match(/concession:\s*(.+)/i) || [])[1]?.trim() ?? null;
  const concession = rawConcession && !/^(null|<)/i.test(rawConcession) ? rawConcession : null;
  // 矛盾探针:字段 agree 但正文含强异议措辞 → 警告(不拦),提示 Owner 展开原文
  const dissent = /(不同意|强烈反对|坚决反对|无法接受|风险过大|保留意见|严重担忧)/.test(text);
  // 假设声明:draft 必备段(题目留白导致的偏差就地显形)
  const assumptions = /(假设声明|assumption)/i.test(text);
  return { sig, hard: hard === 'true', hardMissing: hard === null, summary, concession, dissent, assumptions };
}

function cmdAdvance() {
  const { root, bus } = loadCtx();
  const mode = readJSON(path.join(bus, 'mode.json'));
  if (mode.mode !== 'discussion') die(`当前 mode=${mode.mode},advance 只服务议事环(mode=discussion)。`);
  const sP = path.join(bus, 'discussion', 'state.json');
  const s = readJSON(sP);
  const id = mode.active_task_id; // 权威来源是 mode.json(协议:worker 从 mode 读议题 ID)
  if (!id) die('mode.json.active_task_id 为空。');
  if (s.topic_id !== id) die(`topic_id 不一致:mode.json=${id} vs discussion/state.json=${s.topic_id}。等 Owner 介入。`);
  const tDir = path.join(bus, 'discussion', 'topics', id);
  const F = (n) => path.join(tDir, n);
  const missing = (names) => names.filter((n) => !fs.existsSync(F(n)));

  const report = (nextAction, lines) => {
    console.log('─'.repeat(52));
    console.log(`${id}  phase:${s.phase}`);
    for (const l of lines) console.log(`  ${l}`);
    console.log(`  next_action:${nextAction}`);
    console.log('─'.repeat(52));
  };
  const save = (patch, msg) => {
    Object.assign(s, patch, { updated_by: 'collab.mjs', updated_at: nowISO() });
    writeJSON(sP, s);
    ok(msg);
    if (args.includes('--commit')) {
      // 显式 pathspec:只提交 state.json,绝不连带 index 里他人已暂存的文件(共享工作区 race 教训)
      try {
        git(`commit -m "chore(collab): ${id} → ${s.phase} [skip-review]" -- "${norm(path.relative(root, sP))}"`, { cwd: root });
        ok('已 commit(仅 state.json;未 push,请自行 push)。');
      } catch (e) { die(`commit 失败:${String(e.message).split('\n')[0]}`); }
    }
  };

  const judge = (r) => {
    // 机械收敛判定(discussion-loop.md §六):三个机械字段缺任一 → 卡住(fail-closed);
    // 双方 agree + 任一 hard → 强制 escalated_owner;双方 agree 且无 hard → converged;
    // 任一 disagree:R1 照常进 R2(硬升级议题也不跳过讨论,§九),R2 上限 → escalated_owner
    const w = parseSignals(F(`writer_r${r}_response.md`));
    const v = parseSignals(F(`reviewer_r${r}_response.md`));
    for (const [who, x] of [['writer', w], ['reviewer', v]]) {
      if (!x.summary) return { stuck: `missing_owner_summary(${who})` };
      if (!x.sig) return { stuck: `missing_convergence_signal(${who})` };
      if (x.hardMissing) return { stuck: `missing_hard_escalation_topic(${who})` };
    }
    const warns = [];
    for (const [who, x] of [['writer', w], ['reviewer', v]]) {
      if (x.sig === 'agree' && !x.concession) return { stuck: `missing_concession(${who})——agree 必须写明放弃/接受了什么(反懒惰同意)` };
      if (x.sig === 'agree' && x.dissent) warns.push(`矛盾探针:${who} 字段填 agree 但正文含强异议措辞,建议 Owner 展开该 response 原文核对`);
    }
    const hard = w.hard || v.hard;
    if (w.sig === 'agree' && v.sig === 'agree') {
      if (hard) return { phase: 'escalated_owner', authority: 'owner', why: '双方 agree 但命中硬升级(强制 Owner 拍板)', warns };
      return { phase: 'converged', authority: 'ai_consensus', why: '双方 agree', warns };
    }
    if (r >= 2) return { phase: 'escalated_owner', authority: 'owner', why: '2 轮上限未收敛', warns };
    return { phase: `parallel_draft_round_${r + 1}`, why: `存在 disagree(writer=${w.sig}, reviewer=${v.sig})${hard ? ';硬升级议题,继续 R2 收集利弊后仍归 Owner' : ''}`, warns };
  };

  switch (s.phase) {
    case 'parallel_draft_round_1':
    case 'parallel_draft_round_2': {
      const r = s.phase.endsWith('1') ? 1 : 2;
      const need = [`writer_r${r}_draft.md`, `reviewer_r${r}_draft.md`];
      const miss = missing(need);
      if (miss.length) return report(`wait_for_both_round_${r}_drafts`, ['等待盲发 draft,缺:', ...miss.map((m) => `  - ${m}`)]);
      // draft 内容门:人话摘要 / 硬升级字段 / 假设声明(题目留白就地显形)缺任一 → 卡住
      for (const [who, f] of [['writer', `writer_r${r}_draft.md`], ['reviewer', `reviewer_r${r}_draft.md`]]) {
        const x = parseSignals(F(f));
        if (!x.summary) return report(`missing_owner_summary(${who}_draft)`, [`⚠️ 卡住:${f} 缺"人话摘要"段,等 ${who} 自修。`]);
        if (x.hardMissing) return report(`missing_hard_escalation_topic(${who}_draft)`, [`⚠️ 卡住:${f} 缺 hard_escalation_topic 字段,等 ${who} 自修。`]);
        if (!x.assumptions) return report(`missing_assumption_declaration(${who}_draft)`, [`⚠️ 卡住:${f} 缺"假设声明"段(我假设 X 成立,若不成立结论变 Y),等 ${who} 自修。`]);
      }
      if (s.lite && r === 1) {
        // lite 档:draft 齐后跳过 response 轮,由起草方(轮换)读双方 draft 直接起草 synthesis
        const w = parseSignals(F('writer_r1_draft.md'));
        const v = parseSignals(F('reviewer_r1_draft.md'));
        const patch = { phase: 'lite_synthesis', next_action: 'wait_for_synthesis' };
        if (w.hard || v.hard) patch.decision_authority = 'owner';
        return save(patch, `lite:双方 R1 draft 齐 → 由${roleCN(s.synthesis_author)}读双方 draft 后直接起草 synthesis${patch.decision_authority ? '(命中硬升级,advisory)' : ''}`);
      }
      return save({ phase: `cross_response_round_${r}`, next_action: `wait_for_both_round_${r}_responses` }, `双方 R${r} draft 齐 → cross_response_round_${r}`);
    }
    case 'cross_response_round_1':
    case 'cross_response_round_2': {
      const r = s.phase.endsWith('1') ? 1 : 2;
      const need = [`writer_r${r}_response.md`, `reviewer_r${r}_response.md`];
      const miss = missing(need);
      if (miss.length) return report(`wait_for_both_round_${r}_responses`, ['等待 response,缺:', ...miss.map((m) => `  - ${m}`)]);
      const j = judge(r);
      for (const wmsg of j.warns || []) console.warn(`[collab] ⚠ ${wmsg}`);
      if (j.stuck) return report(j.stuck, [`⚠️ 卡住:${j.stuck} —— 产物缺必备机械段,等对应方自修(中控不代补)。`]);
      const patch = { phase: j.phase, next_action: j.phase === 'converged' || j.phase === 'escalated_owner' ? 'wait_for_synthesis' : `wait_for_both_round_${r + 1}_drafts` };
      if (j.authority) patch.decision_authority = j.authority;
      if (j.phase.startsWith('parallel')) patch.round = r + 1;
      return save(patch, `判定:${j.why} → ${j.phase}`);
    }
    case 'lite_synthesis': {
      const authorCN = roleCN(s.synthesis_author);
      const ackerCN = roleCN(other(s.synthesis_author));
      if (!fs.existsSync(F('synthesis.md'))) return report('wait_for_synthesis', [`lite:等${authorCN}起草 synthesis.md(可读双方 draft,顶部 5 行决策摘要)`]);
      const text = fs.readFileSync(F('synthesis.md'), 'utf8');
      const ackM = text.match(/(writer|reviewer)_ack:\s*(ack_with_amendments|ack|disagree)/i);
      if (!ackM) return report('wait_for_counter_ack', [`lite:synthesis 已起草,等${ackerCN}复核(结构化三问 + ${other(s.synthesis_author)}_ack: ack|ack_with_amendments|disagree)`]);
      const dis = ackM[2].toLowerCase() === 'disagree';
      const hard = s.decision_authority === 'owner';
      const phase = (hard || dis) ? 'escalated_owner' : 'converged';
      return save({ phase, decision_authority: (hard || dis) ? 'owner' : 'ai_consensus', next_action: 'wait_for_owner_decision' }, `lite:复核 ${ackM[2]}${hard ? '+硬升级' : ''} → ${phase}`);
    }
    case 'converged':
    case 'escalated_owner': {
      const authorCN = roleCN(s.synthesis_author);
      const ackerCN = roleCN(other(s.synthesis_author));
      if (!fs.existsSync(F('synthesis.md'))) return report('wait_for_synthesis', [`等${authorCN}起草 synthesis.md(本议题起草权轮换归属:${s.synthesis_author || 'writer'})`]);
      const text = fs.readFileSync(F('synthesis.md'), 'utf8');
      const acked = /(writer|reviewer)_ack:\s*(ack_with_amendments|ack)/i.test(text);
      if (!acked) return report('wait_for_counter_ack', [`synthesis 已起草,等${ackerCN}复核(结构化三问 + ack)`]);
      const esc = s.phase === 'escalated_owner';
      return report('wait_for_owner_decision', [
        `synthesis 就绪${esc ? '(advisory,必须 Owner 拍板)' : ''}:`,
        `  - ${norm(path.relative(root, F('synthesis.md')))}`,
        'Owner 可说:"T-NN 全采纳 / 采纳但X改Y / 驳回"(或 decision 命令收口)',
      ]);
    }
    case 'idle':
      return report('wait_for_owner_topic', ['无活跃议题。Owner 说"讨论 X"启动。']);
    default:
      die(`未知 phase:${s.phase}`);
  }
}

// ---------- check ----------
const REVIEW_STATUS_VALUES = [null, 'APPROVED', 'CHANGES_REQUESTED', 'BLOCKED'];

function classifyBusFile(rel, busName) {
  // 返回文件的属权类别(写权限矩阵 PROTOCOL §五 的机械化)
  const p = norm(rel);
  if (!p.startsWith(busName + '/')) return 'business';
  const r = p.slice(busName.length + 1);
  if (r === 'escalation_rules.md' || r === 'collab.config.json') return 'owner_config';
  if (r === 'locked_decisions.md') return 'decision_ledger';
  if (r === 'review/last_reviewer.md') return 'reviewer_only';
  if (r === 'review/last_writer.md') return 'writer_only';
  if (r === 'review/state.json') return 'review_state';
  if (r === 'mode.json' || r === 'discussion/state.json') return 'orchestrator_only';
  if (/^discussion\/topics\/[^/]+\/reviewer_/.test(r)) return 'reviewer_only';
  if (/^discussion\/topics\/[^/]+\/writer_/.test(r)) return 'writer_only';
  if (/^discussion\/topics\/[^/]+\/synthesis\.md$/.test(r)) return 'synthesis';
  if (/^discussion\/topics\/[^/]+\/(topic\.md|owner_decision\.md)$/.test(r)) return 'orchestrator_only';
  return 'collab_misc';
}

const ACTOR_ALLOWED = {
  // actor → 允许触碰的类别。owner_config(escalation_rules.md / collab.config.json)不在任何 AI actor 清单里:
  // 只有 owner(config): 前缀可碰——AI 严禁使用该前缀,它的存在使 Owner 改配置可提交、AI 篡改必被拦或在 git log 里显形。
  reviewer: ['reviewer_only', 'review_state', 'synthesis', 'collab_misc'],
  writer_opinion: ['writer_only', 'synthesis'],
  business: ['business', 'writer_only', 'review_state', 'collab_misc'],
  orchestrator: ['orchestrator_only', 'collab_misc'],
  collab_maintenance: ['reviewer_only', 'writer_only', 'review_state', 'orchestrator_only', 'synthesis', 'collab_misc'],
  owner_config_actor: ['owner_config', 'decision_ledger', 'collab_misc'],
  // 决策账本单列类:只有 discuss(decision) 誊录与 owner(config) 可碰——防 chore(collab) 等日常前缀绕改防共谋之锚
  decision_transcriber: ['decision_ledger', 'orchestrator_only', 'collab_misc'],
};

function actorFromMessage(firstLine, config) {
  const px = (config && config.commit_prefixes) || {};
  const biz = px.business || ['feat', 'fix', 'docs', 'test', 'refactor', 'perf'];
  if (/^(Merge|Revert|fixup!|squash!)/.test(firstLine)) return { actor: 'skip' };
  if (firstLine.startsWith('owner(config)')) return { actor: 'owner_config_actor', needSkipTag: true };
  if (firstLine.startsWith(px.reviewer_review || 'reviewer(review)')) return { actor: 'reviewer', needSkipTag: true };
  if (firstLine.startsWith(px.reviewer_opinion || 'reviewer(opinion)')) return { actor: 'reviewer', needSkipTag: true };
  if (firstLine.startsWith(px.writer_opinion || 'writer(opinion)')) return { actor: 'writer_opinion', needSkipTag: true };
  if (firstLine.startsWith((px.discuss || 'discuss') + '(synthesis')) return { actor: 'synthesis_actor', needSkipTag: true };
  if (firstLine.startsWith((px.discuss || 'discuss') + '(decision')) return { actor: 'decision_transcriber', needSkipTag: true };
  if (firstLine.startsWith((px.discuss || 'discuss') + '(')) return { actor: 'orchestrator', needSkipTag: true };
  if (firstLine.startsWith(px.collab_maintenance || 'chore(collab)')) return { actor: 'collab_maintenance', needSkipTag: true };
  for (const b of biz) if (firstLine.startsWith(b)) return { actor: 'business', needSkipTag: false };
  return { actor: 'unknown' };
}

function cmdCheck() {
  const { root, bus, busName, config } = loadCtx();
  const problems = [];
  const warns = [];

  // 1. state 健康
  const rP = path.join(bus, 'review', 'state.json');
  if (fs.existsSync(rP)) {
    const r = readJSON(rP);
    if (!REVIEW_STATUS_VALUES.includes(r.review_status)) problems.push(`review_status 非法值:${r.review_status}(只允许 APPROVED/CHANGES_REQUESTED/BLOCKED,铁律 #3)`);
    if (r.review_status && r.review_target_commit === 'HEAD') problems.push('review_target_commit 仍是 HEAD 占位——Reviewer 写结论时必须冻结为具体 hash(铁律 #4)');
    const guards = (config && config.guards) || {};
    const maxB = guards.state_file_size_warn_bytes || 32768;
    const size = fs.statSync(rP).size;
    if (size > maxB) warns.push(`review/state.json 已 ${(size / 1024).toFixed(1)}KB(>${maxB / 1024}KB)——历史叙事请挪 archive(运行 collab.mjs archive)`);
    const d = r.deadlock || {};
    const perUnit = (config?.loops?.review?.deadlock_per_unit) ?? 3;
    const perGate = (config?.loops?.review?.deadlock_per_gate) ?? 2;
    if ((d.unit_rejections || 0) >= perUnit) warns.push(`死锁阈值已达:unit_rejections=${d.unit_rejections}/${perUnit} → 应 DEADLOCK-BLOCKED 等 Owner(铁律 #13)`);
    for (const [g, n] of Object.entries(d.gate_counters || {})) if (n >= perGate) warns.push(`死锁阈值已达:gate ${g}=${n}/${perGate} → 应 DEADLOCK-BLOCKED 等 Owner(铁律 #13)`);
  }
  const dSP = path.join(bus, 'discussion', 'state.json');
  if (fs.existsSync(dSP)) {
    const guards = (config && config.guards) || {};
    const maxB = guards.state_file_size_warn_bytes || 32768;
    const size = fs.statSync(dSP).size;
    if (size > maxB) warns.push(`discussion/state.json 已 ${(size / 1024).toFixed(1)}KB(>${maxB / 1024}KB)——历史叙事请挪 git log/archive(PROTOCOL §三)`);
  }
  const mP = path.join(bus, 'mode.json');
  if (fs.existsSync(mP)) {
    const m = readJSON(mP);
    const maxNote = (config?.guards?.mode_note_max_chars) ?? 500;
    if ((m.note || '').length > maxNote) warns.push(`mode.json.note 超 ${maxNote} 字——mode 文件只放活跃标记,叙事进 git log/archive(PROTOCOL §三)`);
    if (!['review', 'discussion', 'execution', 'idle'].includes(m.mode)) problems.push(`mode 非法值:${m.mode}`);
  }

  // 2. commit 写权限机检(hook 模式)
  const msgIdx = args.indexOf('--commit-msg');
  if (msgIdx > -1) {
    const msgFile = args[msgIdx + 1];
    if (!msgFile || !fs.existsSync(msgFile)) die('--commit-msg 需要提供 commit message 文件路径');
    const firstLine = fs.readFileSync(msgFile, 'utf8').split('\n')[0].trim();
    // -c core.quotepath=false:防非 ASCII(中文)路径被 git 加引号+八进制转义,导致矩阵判类失效
    const staged = git('-c core.quotepath=false diff --cached --name-only', { cwd: root })
      .split('\n').filter(Boolean)
      .map((f) => f.replace(/^"(.*)"$/, '$1'));
    const { actor, needSkipTag } = actorFromMessage(firstLine, config);
    // enforce 开关从 HEAD 已提交版本读取:防"被检查的这次提交自己把检查关掉"
    let enforce = (config?.guards?.enforce_commit_permission_matrix) !== false;
    try {
      const headCfg = JSON.parse(git(`show HEAD:${busName}/collab.config.json`, { cwd: root }));
      enforce = headCfg?.guards?.enforce_commit_permission_matrix !== false;
    } catch { /* 首个 commit 或 config 尚未入库时,退回工作区值 */ }

    if (actor !== 'skip' && enforce) {
      if (needSkipTag && !firstLine.includes('[skip-review]')) problems.push(`协作元层 commit 必须带 [skip-review]:"${firstLine}"(PROTOCOL §九)`);
      if (actor === 'business' && firstLine.includes('[skip-review]')) problems.push('业务 commit 不得带 [skip-review](那会让 Reviewer 跳过审查)');
      const touchedBus = staged.filter((f) => norm(f).startsWith(busName + '/'));
      if (actor === 'unknown') {
        if (touchedBus.length) problems.push(`未知 commit 前缀 "${firstLine}" 却触碰协作总线文件(${touchedBus.join(', ')})——请用协议前缀(PROTOCOL §九)`);
        else warns.push(`未知 commit 前缀 "${firstLine}"(未触碰总线文件,放行)`);
      } else if (actor === 'synthesis_actor') {
        for (const f of staged) {
          const cls = classifyBusFile(norm(f), busName);
          if (!['synthesis', 'collab_misc'].includes(cls)) problems.push(`discuss(synthesis) 只许碰 synthesis.md,却触碰:${f}(${cls})`);
        }
      } else {
        const allowed = ACTOR_ALLOWED[actor] || [];
        for (const f of staged) {
          const cls = classifyBusFile(norm(f), busName);
          if (!allowed.includes(cls)) {
            if (cls === 'owner_config') problems.push(`写权限违规:${f} 是 Owner 维护的配置(改动属硬升级第 1 类)。Owner 本人提交请用前缀 owner(config): ... [skip-review];AI 触碰即越权`);
            else problems.push(`写权限违规:${actor} 前缀的 commit 不许触碰 ${f}(类别 ${cls};矩阵见 PROTOCOL §五)`);
          }
          // 字段级探测:review/state.json 的 review_status / last_reviewed_commit 严格 Reviewer-owned(PROTOCOL §六)
          if (cls === 'review_state' && !['reviewer', 'collab_maintenance', 'owner_config_actor'].includes(actor)) {
            try {
              const diffTxt = git(`-c core.quotepath=false diff --cached -U0 -- "${f}"`, { cwd: root });
              if (/^[+-]\s*"(review_status|last_reviewed_commit)"/m.test(diffTxt)) problems.push(`字段级越权:${actor} 前缀的 commit 改动了 review/state.json 的 review_status/last_reviewed_commit(严格 Reviewer-owned,PROTOCOL §六)`);
            } catch { /* diff 不可得时跳过字段级探测,文件级判定仍生效 */ }
          }
        }
      }
    }
  }

  for (const w of warns) console.warn(`[collab] ⚠ ${w}`);
  if (problems.length) {
    for (const p of problems) console.error(`[collab] ✗ ${p}`);
    process.exit(1);
  }
  ok(`check 通过(${warns.length} 个警告)。`);
}

// ---------- archive ----------
const REVIEW_STATE_LIVE_FIELDS = new Set([
  'protocol_version', 'unit_id', 'round', 'attempt',
  'review_target_commit', 'review_target_type', 'last_reviewed_commit',
  'review_status', 'review_timestamp', 'next_action', 'deadlock', 'note',
]);

function cmdArchive() {
  const { root, bus } = loadCtx();
  const rP = path.join(bus, 'review', 'state.json');
  if (!fs.existsSync(rP)) die('未找到 review/state.json');
  const r = readJSON(rP);
  const archived = {};
  let n = 0;
  for (const k of Object.keys(r)) {
    if (!REVIEW_STATE_LIVE_FIELDS.has(k)) { archived[k] = r[k]; delete r[k]; n++; }
  }
  const maxNote = 500;
  if ((r.note || '').length > maxNote) { archived.__note_overflow = r.note; r.note = r.note.slice(0, maxNote) + '…(全文见 archive)'; n++; }
  if (!n) return ok('无可归档字段,state 已经干净。');
  const dir = path.join(bus, 'review', 'archive');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const aP = path.join(dir, `state-archive-${stamp}.json`);
  writeJSON(aP, { archived_at: nowISO(), fields: archived });
  writeJSON(rP, r);
  ok(`已归档 ${n} 个非活跃字段 → ${norm(path.relative(root, aP))}`);
  info('请把 state.json 与 archive 文件一起 commit(chore(collab): archive state [skip-review])。');
}

// ---------- decision(Owner 拍板机械誊录 + 议题收口) ----------
function cmdDecision() {
  const { root, bus } = loadCtx();
  const mP = path.join(bus, 'mode.json');
  const mode = readJSON(mP);
  const sP = path.join(bus, 'discussion', 'state.json');
  const s = readJSON(sP);
  const id = mode.active_task_id || s.topic_id;
  if (!id) die('无活跃议题。');
  const tDir = path.join(bus, 'discussion', 'topics', id);
  const synP = path.join(tDir, 'synthesis.md');
  if (!fs.existsSync(synP)) die('synthesis.md 尚不存在,还没到拍板阶段(先 advance 到 wait_for_owner_decision)。');

  const fromIdx = args.indexOf('--from');
  if (fromIdx === -1 || !args[fromIdx + 1]) die('用法:decision --from <Owner拍板原文文件> [--status adopted|adopted_with_changes|rejected]\n(机械誊录铁律:Owner 原话必须以文件逐字提供,脚本不代拟、不解读)');
  const ownerText = fs.readFileSync(args[fromIdx + 1], 'utf8').trim();
  const stIdx = args.indexOf('--status');
  const status = stIdx > -1 ? args[stIdx + 1] : 'adopted';
  if (!['adopted', 'adopted_with_changes', 'rejected'].includes(status)) die('--status 只能是 adopted | adopted_with_changes | rejected');

  // 机械抄录 synthesis 的"推荐落地步骤"段(逐字复制,不解读;rejected 不抄)
  let steps = '<无(驳回)或见 synthesis>';
  if (status !== 'rejected') {
    const syn = fs.readFileSync(synP, 'utf8');
    const m = syn.match(/##\s*推荐落地步骤\s*\n([\s\S]*?)(?=\n##\s|$)/);
    if (m) steps = m[1].trim();
  }
  let synCommit = '<见 git log>';
  try { synCommit = git(`log -1 --format=%h -- "${norm(path.relative(root, synP))}"`, { cwd: root }); } catch { /* 未入库 */ }

  let tpl = fs.readFileSync(path.join(KIT_DIR, 'templates', 'owner_decision.md'), 'utf8');
  tpl = tpl
    .replace(/^# T-NNN-<slug> Owner 决策/m, () => `# ${id} Owner 决策`)
    .replace('- status: <adopted | adopted_with_changes | rejected>', () => `- status: ${status}`)
    .replace('- 拍板时间: <ISO 8601>', () => `- 拍板时间: ${nowISO()}`)
    .replace('- 依据 synthesis: <commit hash>', () => `- 依据 synthesis: ${synCommit}`)
    .replace('<Owner 拍板消息原文,一字不改>', () => ownerText)
    .replace('- [x] <步骤 1(全采纳默认全勾;部分采纳按 Owner 口述勾选/修改)>', () => steps);
  fs.writeFileSync(path.join(tDir, 'owner_decision.md'), tpl, 'utf8');

  Object.assign(s, { topic_id: null, phase: 'idle', round: 0, lite: false, synthesis_author: null, decision_authority: null, next_action: 'wait_for_owner_topic', updated_by: 'collab.mjs', updated_at: nowISO() });
  writeJSON(sP, s);
  mode.mode = 'idle'; mode.active_task_id = null; mode.updated_by = 'collab.mjs'; mode.updated_at = nowISO();
  writeJSON(mP, mode);

  ok(`owner_decision.md 已誊录(status=${status}),议题 ${id} 收口,mode → idle`);
  info('若此前在 lean 流水线中(议事只是 detour):被派活方按开工授权例外恢复 —— node collab.mjs mode execution --lean');
  info(`  - ${norm(path.relative(root, path.join(tDir, 'owner_decision.md')))}(请核对 Owner 原文;adopted_with_changes 请人工补"Owner 修改项"段)`);
  info(`  建议 commit:discuss(decision): ${id} Owner 拍板 [skip-review]`);
}

// ---------- decide(决策账本机械誊录:Owner 拍板一条入账一条) ----------
function cmdDecide() {
  const text = args[1];
  if (!text || text.startsWith('--')) die('用法:decide "<决策一句话(Owner 原话)>" [--why "<理由>"] [--source "<门禁①/议事T-001/裁断>"]\n(机械誊录铁律:内容须出自 Owner 拍板,AI 不得代拟决策)');
  const { bus } = loadCtx();
  const p = path.join(bus, 'locked_decisions.md');
  if (!fs.existsSync(p)) die('未找到 _collab/locked_decisions.md(旧版 init 未建,可从 kit templates/ 拷一份)');
  let t = fs.readFileSync(p, 'utf8');
  let maxN = 0;
  for (const m of t.matchAll(/\| D-(\d+) /g)) maxN = Math.max(maxN, parseInt(m[1], 10));
  const id = `D-${String(maxN + 1).padStart(3, '0')}`;
  const opt = (k) => { const i = args.indexOf(k); return i > -1 && args[i + 1] ? args[i + 1] : '—'; };
  const cell = (s) => String(s).replace(/\|/g, '/').replace(/\r?\n/g, ' ');
  const date = new Date().toISOString().slice(0, 10);
  t = t.trimEnd() + `\n| ${id} | ${date} | ${cell(text)} | ${cell(opt('--why'))} | ${cell(opt('--source'))} | 生效 |\n`;
  fs.writeFileSync(p, t, 'utf8');
  ok(`${id} 已入账:${text}`);
  info(`建议 commit:discuss(decision): ${id} 入账 [skip-review]`);
  info('提醒:推翻旧决策时不删旧条——新增一条,旧条"状态"改为"已废弃(被新 D-NNN 取代)";');
  info('该手工修改同样用前缀 discuss(decision): ... [skip-review](或 Owner 的 owner(config): 前缀)提交,其他前缀会被机检拦。');
}

// ---------- proposals(实战沉淀:列出硬升级候选,Owner 一句话逐条采纳) ----------
function cmdProposals() {
  const { root, bus } = loadCtx();
  const p = path.join(bus, 'escalation_candidates.md');
  if (!fs.existsSync(p)) die('未找到 _collab/escalation_candidates.md(旧版 init 未建,可从 kit templates/ 拷一份)');
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => /^ESCALATION-CANDIDATE:/.test(l.trim()));
  if (!lines.length) return ok('当前无待处理候选。协作中 AI 发现"该问 Owner 却无规则可依"时会往该文件追加候选。');
  console.log('─'.repeat(52));
  console.log(`硬升级候选(${lines.length} 条,实战沉淀)——请逐条拍板采纳/驳回:`);
  lines.forEach((l, i) => console.log(`  ${i + 1}. ${l.trim().replace(/^ESCALATION-CANDIDATE:\s*/, '')}`));
  console.log('─'.repeat(52));
  info('采纳:由 Owner 把选中条目写进 _collab/escalation_rules.md"项目自定义追加"段,');
  info('前缀 owner(config): 采纳硬升级候选 [skip-review] 提交;同一 commit 从候选文件删除已处理条目。');
}

// ---------- install-hook ----------
function cmdInstallHook() {
  const { root } = loadCtx();
  const scriptRel = norm(path.relative(root, fileURLToPath(import.meta.url)));
  let hooksPathCfg = '';
  try { hooksPathCfg = git('config core.hooksPath', { cwd: root }); } catch { /* 未设置 */ }
  if (hooksPathCfg) die(`本仓库设置了 core.hooksPath=${hooksPathCfg}(husky/lefthook 等),.git/hooks 会被 git 忽略。\n请把下面一行合并进 ${hooksPathCfg}/commit-msg(没有就创建):\n  node "${scriptRel}" check --commit-msg "$1" || exit 1`);
  const hooksDir = path.join(root, '.git', 'hooks');
  if (!fs.existsSync(hooksDir)) die('.git/hooks 不存在(bare 仓库或 worktree?)');
  const hookPath = path.join(hooksDir, 'commit-msg');
  if (fs.existsSync(hookPath)) {
    const cur = fs.readFileSync(hookPath, 'utf8');
    if (!cur.includes('ai-collab-kit')) die(`已存在其他 commit-msg hook(${norm(hookPath)}),请手动合并:在其中追加\n  node "${scriptRel}" check --commit-msg "$1" || exit 1`);
  }
  fs.writeFileSync(hookPath, `#!/bin/sh
# ai-collab-kit 写权限机检(PROTOCOL §五/§九)
node "${scriptRel}" check --commit-msg "$1" || exit 1
`, { mode: 0o755 });
  ok(`commit-msg hook 已安装:${norm(path.relative(root, hookPath))}`);
  info('注意:hook 是本地的,协作各方(每个 clone)都要各自运行一次 install-hook。');
}

// ---------- 入口 ----------
const commands = { init: cmdInit, status: cmdStatus, mode: cmdMode, topic: cmdTopic, advance: cmdAdvance, next: cmdNext, decision: cmdDecision, decide: cmdDecide, proposals: cmdProposals, check: cmdCheck, archive: cmdArchive, 'install-hook': cmdInstallHook };
if (!cmd || !commands[cmd]) {
  console.log(`ai-collab-kit 中控脚本
用法:node collab.mjs <命令>
  init            初始化 _collab/ 总线
  status          汇报协作状态(机械字段)
  mode <m>        切模式 review|discussion|execution|idle [--lean]
  topic <slug>    启动议题 [--from <owner原文文件>] [--lite 轻量档只走R1]
  advance         议事环推进(检查产物齐否 + 机械收敛判定)[--commit]
  next            输出下一步该贴给哪个窗口的指令(Owner 纯复制转达)
  decision        Owner 拍板机械誊录 + 议题收口 --from <原文文件> [--status ...]
  decide          决策账本入账 "<决策>" [--why] [--source](机械誊录 Owner 拍板)
  proposals       列出实战沉淀的硬升级候选(Owner 逐条采纳/驳回)
  check           健康检查 [--commit-msg <文件>](hook 用)
  archive         归档 review/state.json 非活跃字段
  install-hook    安装 commit-msg 写权限机检 hook`);
  process.exit(cmd ? 1 : 0);
}
commands[cmd]();
