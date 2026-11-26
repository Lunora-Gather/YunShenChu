import assert from 'node:assert/strict';
import { eligibleFreight } from './freight-evidence.mjs';
import { evidenceAnswer } from './watch-evidence.mjs';

const caseTitles = ['长廊里的三声钟', '雨棚下的灯', '晚到的货箱', '雾里的呼应灯', '末班夜邮', '谁在点晚安曲'];

async function readOrder(page, skip) {
  const title = await page.locator('.watch-brief h2').innerText();
  const kind = caseTitles.indexOf(title);
  assert(kind >= 0, title);
  const readings = await page.locator('.watch-paper .watch-readings > div').evaluateAll(rows => rows.map(row => ({
    value: row.querySelector('dd strong')?.textContent,
    detail: row.querySelector('dd small')?.textContent,
  })));
  const tracks = await page.locator('.watch-track').evaluateAll(rows => rows.map(row => ({
    sounds: row.lastChild.textContent.split(' · '),
  })));
  return { kind, answer: evidenceAnswer({ kind, readings, tracks }, skip) };
}

export async function verifyWatchTour(browser, url) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const seen = new Set();
  let firstLetter;
  try {
    await page.goto(url + '/YunShenChu/?view=field');
    await page.locator('.watch-entry').tap();
    for (let number = 1; number <= 13; number++) {
      const fullRoute = number >= 5 && number <= 8;
      const skip = fullRoute ? -1 : (number + 1) % 3;
      for (let i = 0; i < 3; i++) {
        if (i === skip) continue;
        await page.locator('[data-stop="' + i + '"]').tap();
        await page.locator('.watch-primary').tap();
        await page.waitForFunction(i => document.querySelector('[data-stop="' + i + '"]').textContent.includes('已取样'), i);
      }
      if (number === 13) {
        await page.locator('.watch-listen').tap();
        await page.waitForSelector('.watch-listen[aria-pressed="true"]');
        await page.waitForSelector('.watch-listen[aria-pressed="false"]');
      }
      if (number === 3) await page.reload();
      await page.waitForSelector('.watch-orders');
      const { kind, answer } = await readOrder(page, skip);
      seen.add(kind);
      await page.locator('.watch-orders label').nth(answer).tap();
      await page.locator('.watch-submit').tap();
      await page.waitForSelector('.watch-result');
      if (number === 1) firstLetter = await page.locator('.watch-caption p').innerText();
      assert.match(await page.locator('.watch-result strong').first().innerText(), /调度生效/);
      if (number === 4) await page.locator('.watch-contracts label').nth(1).tap();
      if (number === 8) assert.match(await page.locator('.watch-award').innerText(), /全线复核章/);
      if (number === 12) {
        await page.setViewportSize({ width: 1324, height: 780 });
        await page.locator('.night-watch').evaluate(el => { el.scrollTop = 0; });
        const next = await page.locator('.watch-result .watch-primary').boundingBox();
        assert(next.y + next.height <= 780, 'The next shift stays in view alongside all three pledges');
        await page.setViewportSize({ width: 390, height: 844 });
      }
      assert.equal(await page.locator('.watch-reason').count(), 1);
      assert.equal(await page.locator('.night-watch').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      await page.locator('.watch-result .watch-primary').tap();
    }
    assert.equal(seen.size, 6);
    await page.locator('.watch-tabs button').nth(2).tap();
    assert.equal(await page.locator('.watch-log').count(), 12);
    await page.locator('.watch-log > summary').first().tap();
    await page.locator('.watch-log[open] .watch-handover summary').tap();
    await page.waitForSelector('.watch-log[open] .watch-readings');
    assert.equal(await page.locator('.watch-log > summary small').last().innerText(), '02');
    await page.locator('.watch-log:last-child > summary').scrollIntoViewIfNeeded();
    const tabs = page.locator('.watch-tabs');
    const pinned = await tabs.boundingBox();
    assert(pinned.y >= 0 && pinned.y + pinned.height <= 844, 'Ledger tabs stay reachable while reading earlier shifts');
    await tabs.getByRole('button', { name: '街区修缮' }).tap();
    const heading = await page.locator('.watch-page-heading').boundingBox();
    assert(heading.y >= pinned.height && heading.y < 844, 'Opening another page returns to its heading');
    await page.setViewportSize({ width: 1324, height: 780 });
    await tabs.getByRole('button', { name: '交班簿' }).click();
    const ledger = await page.locator('.watch-page-body').boundingBox();
    const field = await page.locator('.watch-field').boundingBox();
    assert(Math.abs(ledger.y + ledger.height - field.y - field.height) <= 1, 'Full ledger uses the height of the field');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.getByRole('button', { name: '街区修缮' }).tap();
    const bridge = page.locator('.watch-project').filter({ has: page.locator('summary', { hasText: '下环 · 塔底检修口' }) });
    await bridge.locator(':scope > summary').tap();
    const letters = bridge.locator('.watch-letter');
    assert.equal(await letters.count(), 3);
    await letters.first().locator('summary').tap();
    assert.match(await letters.first().innerText(), /接通引路灯/);
    assert.equal(await letters.first().locator('blockquote p').innerText(), firstLetter);
    await page.getByRole('button', { name: '调度单', exact: true }).tap();
    for (const stop of [1, 2]) {
      await page.locator('[data-stop="' + stop + '"]').tap();
      await page.locator('.watch-primary').tap();
    }
    const { answer } = await readOrder(page, 0);
    const wrong = (answer + 1) % 3;
    await page.locator('.watch-orders label').nth(wrong).tap();
    await page.locator('.watch-submit').tap();
    const effect = await page.locator('.watch-handover > p').first().innerText();
    assert.match(effect, /^[上中下]环留下了复检工单/);
    const ring = effect.slice(0, 2);
    const place = await page.locator('.watch-caption h3').innerText();
    await page.reload();
    assert.equal(await page.locator('.watch-caption h3').innerText(), place);
    await page.getByRole('button', { name: '查看' + ring + '修缮' }).tap();
    const followup = page.locator('.watch-project[open]');
    assert.equal(await followup.locator(':scope > summary span').innerText(), ring + ' · ' + place);
    assert.match(await followup.locator(':scope > p').innerText(), /复检单待清/);
    await page.locator('.watch-back').tap();
    await page.waitForSelector('.observer-console');
    assert.deepEqual(errors, []);
    console.log('PASS  Fourteen touch-played shifts, six incident types, a service pledge, rolling handovers, earlier resident letters, and a reopened follow-up order');
  } finally {
    await page.close();
  }
}

export async function verifyResidentTour(page) {
  const keys = ['yunshenchu.observer.v4', 'yunshenchu.observer.replay.v4'];
  const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), keys[1]);
  const sample = async station => {
    await page.locator('[data-stop="' + station + '"]').tap();
    await page.locator('.watch-primary').tap();
    await page.waitForSelector('[data-stop="' + station + '"] small svg');
  };
  const read = async () => {
    const guide = await page.locator('.watch-guide p').first().innerText();
    const readings = await page.locator('.watch-paper .watch-readings > div').evaluateAll(rows => rows.map(row => {
      const value = row.querySelector('dd strong')?.textContent;
      return value ? { value, detail: row.querySelector('dd small').textContent } : null;
    }));
    return { guide, readings };
  };
  const send = async choice => {
    await page.locator('.watch-orders label').nth(choice).tap();
    await page.locator('.watch-submit').tap();
    await page.waitForSelector('.watch-result');
  };
  const next = () => page.locator('.watch-result .watch-primary').tap();
  await page.getByRole('dialog').getByRole('button', { name: '返回云城' }).tap();
  await page.getByRole('button', { name: '返回标题画面' }).tap();
  await page.getByRole('link', { name: /居民来信/ }).tap();

  for (let trip = 1; trip <= 3; trip++) {
    await page.getByRole('navigation', { name: '选择居民来信' }).locator('[data-stop="1"]').tap();
    await page.getByRole('button', { name: '接下这封信' }).tap();
    const name = await page.locator('.watch-brief h2').innerText();
    assert.match(name, [null, /茶壶/, /粗瓷杯/, /菜单/][trip]);
    if (trip === 2) {
      await page.locator('summary').filter({ hasText: '请街坊代抄' }).tap();
      await page.getByRole('button', { name: '致电守摊的阿禾' }).tap();
      await page.reload();
      await page.getByText(/来电代抄/).waitFor();
      await sample(0); await sample(2);
    } else { for (const i of [0, 1, 2]) await sample(i); }
    let { guide, readings } = await read();
    const carriers = eligibleFreight(6, guide, readings);
    assert.equal(carriers.length, 2);
    const route = trip === 2 ? '接力' : '直送';
    await send(carriers.find(i => readings[i].detail.includes(route)));
    assert.match(await page.locator('.watch-result').innerText(), /下一班/);
    if (trip === 1) {
      await page.locator('.watch-back').tap();
      await page.locator('.console-menu').tap();
      await page.reload();
      await page.getByRole('link', { name: /续办「缺了盖的茶壶」/ }).tap();
    }
    await next();
    assert.match(await page.locator('.watch-brief p').innerText(), /上一班接走了货/);
    for (const i of [0, 1]) await sample(i);
    ({ guide, readings } = await read());
    const correct = eligibleFreight(trip === 2 ? 8 : 7, guide, readings)[0] ?? 2;
    if (trip === 1) {
      await send((correct + 1) % 3);
      await page.getByText(/托付仍在簿上/).waitFor();
      await page.reload();
      await next();
      for (const i of [0, 1]) await sample(i);
      ({ guide, readings } = await read());
      await send(eligibleFreight(7, guide, readings)[0] ?? 2);
    } else await send(correct);
    assert.match(await page.locator('.watch-caption h3').innerText(), /阿禾签收/);
    assert.equal((await saved()).nightWatch.deliveries[1], trip);
    if (trip < 3) await next();
  }
  await page.reload();
  await page.getByRole('button', { name: /接回程 · 给桥下的热汤/ }).tap();
  await page.getByText('街区联运 · 回程捎货', { exact: false }).first().waitFor();
  for (const i of [0, 2]) await sample(i);
  const { readings, guide } = await read();
  await send(eligibleFreight(9, guide, readings)[0] ?? 1);
  await page.getByText(/汤到桥下还有热气/).waitFor();
  assert.equal((await saved()).nightWatch.returnTrips[2], 1);
  await page.getByRole('button', { name: '街区修缮' }).tap();
  await page.locator('.watch-project[open] summary').filter({ hasText: '中环来货' }).tap();
  await page.locator('.watch-project[open] blockquote').filter({ hasText: /汤到桥下/ }).waitFor();
  await page.locator('.watch-back').tap();
  await page.locator('.rail-district').nth(1).tap();
  await page.locator('.watch-city-letter').filter({ hasText: '菜单挂起来了' }).waitFor();
  assert.equal(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).nightWatch?.deliveries, keys[0]), undefined);
  console.log('PASS  After the five findings, seven successful freight legs and a retry connect three resident letters, a telephone contact, a return shipment and a lasting field reply in the replay slot');
}
