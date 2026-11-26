import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { verifyWatchTour, verifyResidentTour } from './watch-tour.mjs';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname } from 'node:path';

const useWebKit = process.argv.includes('--webkit');
if (!useWebKit && process.platform !== 'darwin') throw new Error('Safari checks require macOS. Use npm run test:browser on other platforms.');

const dist = new URL('../dist/', import.meta.url);
const index = await readFile(new URL('index.html', dist), 'utf8');
const flow = await readFile(new URL('./browser-flow.js', import.meta.url));
const hostPage = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>YunShenChu browser checks</title>
<style>body{margin:0;background:#071624;color:#e1f4ff;font:14px system-ui}pre{margin:0;padding:6px 10px;height:2.4em;overflow:auto;white-space:pre-wrap}iframe{display:block;border:0}</style>
<pre id="report" aria-live="polite">Running YunShenChu browser checks…</pre>
<iframe title="YunShenChu application" width="1366" height="768"></iframe>
<script type="module" src="/browser-flow.js"></script>
</html>`;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

let finish;
const result = new Promise((resolve) => { finish = resolve; });
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  response.setHeader('Cache-Control', 'no-store');

  try {
    if (request.method === 'POST' && path === '/results') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const { message, passed } = JSON.parse(Buffer.concat(chunks));
      console.log(message);
      response.writeHead(204).end();
      if (typeof passed === 'boolean') finish(passed);
      return;
    }

    if (request.method !== 'GET') {
      response.writeHead(405).end();
    } else if (path === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(hostPage);
    } else if (path === '/browser-flow.js') {
      response.writeHead(200, { 'Content-Type': mimeTypes['.js'] }).end(flow);
    } else if (path === '/YunShenChu/' || path === '/YunShenChu/no-storage') {
      const page = path.endsWith('no-storage') ? index.replace('<head>', `<head>
        <script>Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('Denied', 'SecurityError'); }});</script>`) : index;
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(page);
    } else if (/^\/YunShenChu\/(?:assets\/[\w-]+\.(?:css|js|jpg)|[\w-]+\.svg)$/.test(path)) {
      const content = await readFile(new URL(path.slice('/YunShenChu/'.length), dist));
      response.writeHead(200, { 'Content-Type': mimeTypes[extname(path)] }).end(content);
    } else {
      response.writeHead(404).end();
    }
  } catch (error) {
    console.error(error);
    response.writeHead(500).end();
    finish(false);
  }
});

async function verifyFieldRecovery(browser, url) {
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, hasTouch: true });
  try {
    await page.goto(url + '/YunShenChu/?replay');
    await page.locator('.title-play').tap();
    assert.equal(new URL(page.url()).hash, '#field');
    await page.locator('.rail-district').nth(1).tap();
    await page.locator('img.city-panorama[src*="district-midring"]').waitFor();
    const frame = page.locator('.scene-frame');
    assert.deepEqual(await frame.locator('.weather-overlay-container').boundingBox(), await frame.boundingBox());
    await page.route('**/camera-midring-*.jpg', route => route.abort(), { times: 1 });
    await frame.locator('.scene-waypoint').tap();
    const retry = frame.getByRole('button', { name: /现场画面加载失败/ });
    await retry.waitFor();
    assert.equal(await frame.locator('img.city-panorama').count(), 0);
    await retry.tap();
    const near = frame.locator('img.city-panorama[src*="camera-midring"]');
    await near.waitFor();
    await page.getByRole('tab', { name: '档案' }).tap();
    await page.reload();
    await near.waitFor();
    assert.equal(await page.getByRole('tab', { name: '档案' }).getAttribute('aria-selected'), 'true');
    await page.goBack();
    await page.locator('.title-play').waitFor();
    await page.goForward();
    await near.waitFor();
    await page.getByRole('tab', { name: '现场' }).tap();
    await page.locator('.watch-entry').tap();
    await page.locator('.night-watch').waitFor();
    await page.goBack();
    await near.waitFor();
    assert(new URL(page.url()).searchParams.has('replay'));
    console.log('PASS  Small-screen image retry, weather bounds, refresh and browser history retain the live field position');
  } finally {
    await page.close();
  }
}

async function verifyTitlePausesObservation(browser, url) {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  try {
    await page.clock.install();
    await page.addInitScript(() => { Math.random = () => 0.99; });
    await page.goto(`${url}/YunShenChu/`);
    const begin = page.getByRole('button', { name: /^开始调查/ });
    await begin.waitFor();
    const diaryCount = () => page.evaluate(() => (
      JSON.parse(localStorage.getItem('yunshenchu.observer.v4'))?.diary.length ?? 0
    ));
    await page.clock.fastForward(50_000);
    assert.equal(await diaryCount(), 0);
    await begin.click();
    await page.clock.fastForward(50_000);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('yunshenchu.observer.v4'))?.diary.length > 0);
    await page.getByRole('button', { name: '返回标题画面' }).click();
    const recorded = await diaryCount();
    await page.clock.fastForward(60_000);
    assert.equal(await diaryCount(), recorded);
    console.log('PASS  City simulation runs during observation and leaves the diary alone at the title screen');
  } finally {
    await page.close();
  }
}

async function verifyTouchPlaythrough(browser, url) {
  const page = await browser.newPage({ hasTouch: true, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const externalRequests = [];
  try {
    await page.route('**/*', async (route) => {
      const target = new URL(route.request().url());
      if (target.origin === url || target.protocol === 'data:' || target.protocol === 'blob:') {
        await route.continue();
      } else {
        externalRequests.push(target.href);
        await route.abort();
      }
    });
    await page.goto(`${url}/YunShenChu/`);
    await page.getByRole('button', { name: /^开始调查/ }).tap();
    const launch = page.getByRole('button', { name: '全城扫频', exact: true });
    await launch.focus();
    await page.keyboard.press('Enter');

    const close = page.getByRole('button', { name: '关闭信号接收器' });
    await close.waitFor();
    assert.equal(await close.evaluate((element) => element === document.activeElement), true);
    const tuner = page.getByRole('slider', { name: '调节接收频率' });
    await tuner.press('End');
    assert.equal(await tuner.inputValue(), '220');
    assert.equal(await page.getByRole('button', { name: '调高 0.1 MHz' }).isDisabled(), true);
    await tuner.press('ArrowLeft');
    await page.waitForFunction(() => document.querySelector('.frequency-value')?.textContent === '219.9');
    await page.getByRole('button', { name: '调高 0.1 MHz' }).tap();
    await page.waitForFunction(() => document.querySelector('.frequency-value')?.textContent === '220.0');
    const scan = page.getByRole('button', { name: '自动扫频', exact: true });
    await scan.focus();
    await page.keyboard.press('Enter');
    await page.getByText('已锁定 1/5 个信号').waitFor();
    assert.equal(await scan.getAttribute('aria-busy'), 'false');
    await page.keyboard.press('Escape');
    await close.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('strip-scan-action')), true);

    await page.keyboard.press('Control+k');
    const query = page.getByRole('searchbox', { name: '搜索调查台指令' });
    await query.fill('archive');
    await page.getByRole('button', { name: '调查档案' }).waitFor();
    await query.fill('档案');
    await query.press('Enter');
    const archive = page.getByRole('tab', { name: '档案' });
    await archive.waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'inspector-tab-archive');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: '居民' }).getAttribute('aria-selected'), 'true');

    await page.getByRole('button', { name: '全城扫频' }).tap();
    await page.getByText(/未记录信号在低频一侧/).waitFor();
    await page.getByRole('button', { name: /104\.2/ }).tap();
    await page.getByRole('dialog').getByRole('button', { name: '翻开案卷' }).tap();
    await page.getByRole('dialog').getByRole('button', { name: '翻阅导航登记', exact: true }).tap();
    await page.getByRole('button', { name: '下环 · 归墟，比对测距记录', exact: true }).tap();
    await page.getByRole('log').getByText(/地图标记 GUIXU/).waitFor();
    await page.getByRole('button', { name: '收起深层终端' }).tap();
    await page.getByRole('button', { name: '下环 · 归墟，对齐监控底片', exact: true }).tap();
    const evidence = page.locator('.capture-desk');
    await evidence.getByRole('heading', { name: /底片对齐/ }).waitFor();
    const box = await evidence.boundingBox();
    assert(box && box.y >= 0 && box.y + box.height <= 844);
    await page.locator('.capture-first [data-feature="gantry"]').tap();
    await page.locator('.capture-second [data-feature="gantry"]').tap();
    await page.getByRole('button', { name: '采集记录' }).tap();
    await page.getByRole('button', { name: '返回调查' }).tap();
    await page.getByRole('button', { name: '下环 · 归墟，提交调查结论' }).tap();
    await page.locator('input[name="citation"][value="range-second"]').tap();
    await page.locator('input[name="citation"][value="camera-shadow"]').tap();
    await page.getByRole('navigation', { name: '案卷目录' }).getByRole('button', { name: '调查结论' }).tap();
    await page.waitForFunction(() => document.activeElement?.id === 'case-findings-title');
    await page.getByRole('radio', { name: /未登记的建筑/ }).tap();
    await page.getByRole('button', { name: '提交结论', exact: true }).tap();
    await page.getByRole('heading', { name: '已归档的结论' }).waitFor();
    await page.getByRole('button', { name: '继续调查', exact: true }).tap();

    const next = (name) => page.getByRole('button', { name, exact: true }).tap();
    const closeTerminal = () => page.getByRole('button', { name: '收起深层终端' }).tap();
    const capture = async () => {
      await page.getByRole('button', { name: '采集记录', exact: true }).tap();
      await page.getByRole('button', { name: '返回调查' }).tap();
    };
    const stage = async (count) => {
      await page.getByRole('button', { name: '全城信号接收器', exact: true }).tap();
      await page.getByRole('button', { name: '自动扫频', exact: true }).tap();
      await page.getByText(`已锁定 ${count}/5 个信号`).waitFor();
      await page.getByRole('button', { name: '关闭信号接收器' }).tap();
    };
    const file = async (theory, first, second, final = false) => {
      await page.locator('.strip-next-action').filter({ hasText: '提交调查结论' }).tap();
      for (const value of [first, second]) await page.locator(`input[name="citation"][value="${value}"]`).tap();
      await page.locator(`input[name="theory"][value="${theory}"]`).tap();
      await page.getByRole('button', { name: '提交结论', exact: true }).tap();
      await page.getByRole('heading', { name: '已归档的结论' }).waitFor();
      if (final) await page.getByRole('dialog').getByRole('button', { name: '关闭案卷' }).tap();
      else await page.getByRole('button', { name: '继续调查', exact: true }).tap();
    };

    await stage(2);
    await next('下环 · 云下合唱，查看风井工单');
    await next('下环 · 云下合唱，标记压力波峰');
    await page.locator('[data-sample="lower-front"]').tap();
    await page.locator('[data-sample="upper-front"]').tap();
    await capture();
    await next('下环 · 云下合唱，听取值班证词');
    await page.getByRole('button', { name: '收录值班证词' }).tap();
    await file('undercloud', 'pressure-lower', 'shift-direction');

    await stage(3);
    await next('上环 · 幽灵轨道，查阅发车记录');
    await next('上环 · 幽灵轨道，追踪道岔日志');
    await closeTerminal();
    await next('上环 · 幽灵轨道，核对封存许可');
    await page.getByRole('textbox', { name: '许可编号' }).fill('A9-NULL');
    await capture();
    await file('sealed-permit', 'rail-key', 'rail-permit');

    await stage(4);
    await next('中环 · 核心心跳，核对市集负载');
    await next('中环 · 核心心跳，调取终端读数');
    await closeTerminal();
    await next('中环 · 核心心跳，对照两次试验');
    await page.locator('[data-trial="redraw"]').tap();
    await page.locator('[data-trial="subscribe"]').tap();
    await page.locator('input[name="bus-trial"][value="subscribe"]').tap();
    await capture();
    await file('on-subscribe', 'core-focus', 'core-pulse');

    await stage(5);
    await next('观察台 · 观察者回声，追查回传日志');
    await closeTerminal();
    await next('观察台 · 观察者回声，核对记忆记录');
    await closeTerminal();
    await next('观察台 · 观察者回声，校准日记时钟');
    await page.getByRole('button', { name: '查阅初代校时记录' }).tap();
    await page.getByRole('button', { name: '抄录基准脉冲' }).tap();
    await page.getByRole('button', { name: '返回当班日记' }).tap();
    await page.getByRole('combobox', { name: '日记时钟修正量' }).selectOption('-100');
    await capture();
    await file('preceded-input', 'observer-packet', 'observer-input', true);

    await page.getByRole('button', { name: '打开最终调度单' }).tap();
    for (const [field, reading] of [
      ['position', 'range-second'], ['authority', 'rail-permit'], ['cue', 'pressure-match'],
      ['connection', 'core-focus'], ['passenger', 'observer-packet'],
    ]) {
      await page.locator(`#manifest-${field}`).selectOption(reading);
    }
    await page.getByRole('button', { name: '核验发车清单' }).tap();
    await page.getByRole('radio', { name: /暂停发车/ }).tap();
    await page.getByRole('button', { name: '发出调度指令' }).tap();
    await page.getByRole('heading', { name: '月台的灯没有亮' }).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: '返回云城' }).tap();
    await page.reload();
    await page.getByRole('button', { name: '返回标题画面' }).tap();
    await page.getByRole('button', { name: /^重返云城/ }).tap();
    await page.getByRole('button', { name: '重读结局' }).tap();
    await page.getByRole('heading', { name: '月台的灯没有亮' }).waitFor();
    console.log('PASS  Trusted keyboard and full mobile touch playthrough from title to restored ending');

    await page.getByRole('dialog').getByRole('button', { name: '返回云城' }).tap();
    await page.getByRole('tab', { name: '系统' }).tap();
    await page.getByRole('button', { name: '管理存档' }).tap();
    const [backup] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '下载备份' }).tap(),
    ]);
    const exported = await readFile(await backup.path());
    await page.getByRole('button', { name: '关闭存档管理' }).tap();
    await page.getByRole('button', { name: '返回标题画面' }).tap();
    await page.getByRole('link', { name: '打开独立重玩档' }).tap();
    await page.getByRole('button', { name: /^开始调查/ }).waitFor();
    await page.getByRole('button', { name: '管理存档' }).tap();
    const backupInput = page.locator('input[aria-label="备份文件"]');
    await backupInput.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('broken') });
    await page.getByText('文件无法解析为 JSON 备份。').waitFor();
    assert.equal(await page.getByRole('button', { name: '合并进度' }).count(), 0);

    await backupInput.setInputFiles({ name: backup.suggestedFilename(), mimeType: 'application/json', buffer: exported });
    await page.getByText('主存档 · 已锁定 5 个信号 · 已结案 5 起').waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('yunshenchu.observer.replay.v4')).departureDecision), null);
    await page.getByRole('button', { name: '合并进度' }).tap();
    await page.getByText('已合并至重玩档。').waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('yunshenchu.observer.v4')).departureDecision.choice), 'hold');
    await page.getByRole('button', { name: '关闭存档管理' }).tap();
    await page.getByRole('button', { name: /^重返云城/ }).tap();
    await page.getByRole('button', { name: '重读结局' }).tap();
    await page.getByRole('heading', { name: '月台的灯没有亮' }).waitFor();
    console.log('PASS  File download, invalid file rejection, restore preview, and replay-slot recovery from the UI');
    await verifyResidentTour(page);
    assert.deepEqual(externalRequests, [], 'Playing through the packaged app should not contact any external server');
  } finally {
    await page.close();
  }
}

let browser;
let timeout;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  if (useWebKit) {
    const { webkit } = await import('playwright');
    browser = await webkit.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
    page.on('pageerror', (error) => {
      console.error(error);
      finish(false);
    });
    await page.goto(url);
  } else {
    console.log(`Opening ${url} in Safari. Keep the test tab visible until the checks finish.`);
    execFileSync('/usr/bin/open', ['-b', 'com.apple.Safari', url]);
  }
  timeout = setTimeout(() => {
    console.error('Browser checks did not report a result within five minutes.');
    finish(false);
  }, 300_000);
  const passed = await result;
  clearTimeout(timeout);
  if (passed && browser) {
    await verifyFieldRecovery(browser, url);
    await verifyTitlePausesObservation(browser, url);
    await verifyTouchPlaythrough(browser, url);
    await verifyWatchTour(browser, url);
  }
  process.exitCode = passed ? 0 : 1;
} finally {
  clearTimeout(timeout);
  await browser?.close();
  server.close();
}
