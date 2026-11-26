import assert from 'node:assert/strict';
import { eligibleFreight } from './freight-evidence.mjs';
import { evidenceAnswer } from './watch-evidence.mjs';
import { describe, it } from 'node:test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../src/data/nightWatch.ts', import.meta.url));
const bundle = await build({ configFile: false, logLevel: 'silent', build: { write: false, lib: { entry, formats: ['es'] } } });
const { initialWatch, watchIncident, advanceWatch, validWatch, mergeWatch, sampled, offeredReturn } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle[0].output[0].code).toString('base64'));

function settle(book, mask, error = false, pledge = 0) {
  book = advanceWatch(book, { type: 'start', number: book.number, pledge });
  for (let i = 0; i < 3; i++) if (sampled(mask, i)) book = advanceWatch(book, { type: 'sample', number: book.number, site: i });
  const { answer } = watchIncident(book);
  return advanceWatch(book, { type: 'dispatch', number: book.number, choice: (answer + Number(error)) % 3 });
}

describe('night watch', () => {
  it('all three two-stop routes give an unambiguous answer from the printed evidence over 1024 shifts', () => {
    const variants = new Set();
    for (let n = 1; n <= 1024; n++) {
      const incident = watchIncident({ ...initialWatch, number: n, backlog: [n % 4, (n >> 2) % 4, (n >> 4) % 4] });
      for (let skip = 0; skip < 3; skip++) assert.equal(evidenceAnswer(incident, skip), incident.answer, 'Shift ' + n);
      variants.add(incident.kind + '-' + incident.answer);
    }
    assert.equal(variants.size, 18);
  });
  it('isolates concurrent routes, protects settled shifts and unions samples of the same incident', () => {
    assert.equal(advanceWatch(initialWatch, { type: 'dispatch', choice: 0, number: 1 }), initialWatch);
    const a = advanceWatch(initialWatch, { type: 'sample', site: 0, number: 1 });
    const b = advanceWatch(initialWatch, { type: 'sample', site: 1, number: 1 });
    assert.equal(mergeWatch(a, b).samples, 3);
    const settled = settle(a, 3);
    assert.equal(mergeWatch(b, settled), settled);
    assert.equal(advanceWatch(settled, { type: 'dispatch', choice: 1, number: 1 }), settled);
    const other = settle(initialWatch, 6, true);
    assert.deepEqual(mergeWatch(settled, other), mergeWatch(other, settled));
    assert.equal(mergeWatch(settled, other).history.length, 1);
  });
  it('assigns free crews, carries missed calls forward, restores all nine projects and earns all three pledges', () => {
    let b = settle(initialWatch, 3, true);
    assert.equal(b.backlog.reduce((a,c) => a+c), 1);
    const affected = b.backlog.indexOf(1);
    b = settle(b, 7 ^ (1 << affected));
    assert.equal(b.works[affected], 0);
    assert.equal(b.backlog[affected], 0);
    for (let i = 0; i < 2; i++) b = settle(b, 7);
    for (let pledge = 0; pledge < 3; pledge++) {
      for (let i = 0; i < 4; i++) b = settle(b, pledge === 1 ? 7 : [3,5,6][i % 3], false, pledge);
      assert.equal(b.stamps[pledge], 1);
      assert.equal(b.history[0].award, pledge);
    }
    for (let i = 0; i < 32; i++) b = settle(b, [3,5,6][i % 3]);
    assert.deepEqual(b.works,[3,3,3]);
    assert.equal(b.history.length,12);
    assert.equal(validWatch(JSON.parse(JSON.stringify(b))),true);
    assert.equal(validWatch({ ...b, history: [] }),false);
  });
});

describe('resident freight after the five findings', () => {
  const ticketFor = j => j && [j.start, j.site, j.trip, j.permit, j.via ?? '-', j.from ?? '-'].join('/');
  const start = (b, backhaul = false) => advanceWatch(b, { type: 'start', number: b.number, backhaul });
  const accept = (b, site, permit = 'hold') => advanceWatch(b, { type: 'accept', site, number: b.number }, permit);
  const act = (b, type, fields = {}) => advanceWatch(b, { type, number: b.number, ticket: ticketFor(b.parcel), ...fields });
  const dispatch = (b, choice) => act(b, 'dispatch', { choice });
  const collect = b => [0, 1, 2].reduce((now, site) => act(now, 'sample', { site }), b);
  const answer = b => {
    const inc = watchIncident(b);
    return eligibleFreight(inc.kind, inc.guide, inc.readings);
  };

  it('delivers all nine letters, opens all six links and keeps the routes working after the ledger rolls over', () => {
    let b = initialWatch;
    for (let trip = 1; trip <= 7; trip++) {
      for (let site = 0; site < 3; site++) {
        b = collect(accept(start(b), site));
        const choices = answer(b);
        assert.equal(choices.length, 2);
        const inc = watchIncident(b);
        const bay = choices.find(i => inc.readings[i].detail.includes(trip % 2 ? '直送' : '接力'));
        b = dispatch(b, bay);
        assert.equal(b.parcel.via, bay);
        assert(validWatch(b));
        b = collect(start(JSON.parse(JSON.stringify(b))));
        assert.deepEqual(answer(b), [watchIncident(b).answer]);
        b = dispatch(b, answer(b)[0]);
        assert.equal(b.deliveries[site], trip);
        assert(validWatch(b));
        if (trip < 3) { assert.equal(offeredReturn(b), undefined); continue; }
        const to = (site + (trip % 2 ? 1 : 2)) % 3;
        assert.equal(offeredReturn(b).site, to);
        assert.equal(start(b).parcel, undefined);
        b = collect(start(b, true));
        assert.equal(watchIncident(b).kind, 9);
        assert.deepEqual(answer(b), [watchIncident(b).answer]);
        b = dispatch(b, answer(b)[0]);
        assert.equal(offeredReturn(b), undefined);
        assert(validWatch(b));
      }
    }
    assert.deepEqual(b.deliveries, [7, 7, 7]);
    assert(b.returnTrips.every(n => n >= 2));
    assert.equal(b.history.length, 12);
  });

  it('makes the final clearance change which train works on the same published timetable', () => {
    for (let n = 1; n <= 72; n++) {
      const trains = new Set();
      let board;
      for (const permit of ['hold', 'clear', 'local']) {
        let b = collect(accept({ ...initialWatch, number: n }, 1, permit));
        const bay = answer(b).find(i => watchIncident(b).readings[i].detail.includes('直送'));
        b = start(dispatch(b, bay));
        const inc = watchIncident(b);
        assert.deepEqual(answer(b), [inc.answer]);
        const timetable = inc.readings.map(r => r.value);
        if (board) assert.deepEqual(timetable, board);
        board = timetable;
        trains.add(inc.answer);
      }
      assert.equal(trains.size, 3);
    }
  });

  it('handles wrong turns, reloads, one telephone reading and competing orders without crossing waybills', () => {
    const request = { type: 'accept', number: 1, site: 0 };
    assert.equal(advanceWatch(initialWatch, request), initialWatch);
    let b = accept(initialWatch, 0);
    assert.equal(act(b, 'radio', { site: 0 }), b);
    const other = act(accept(initialWatch, 1), 'sample', { site: 1 });
    const merged = mergeWatch(b, other);
    assert.deepEqual(merged, mergeWatch(other, b));
    assert.equal(merged.samples, 0);
    assert.equal(advanceWatch(merged, { type: 'sample', site: 1, number: 1, ticket: ticketFor(other.parcel) }), merged);
    b = collect(b);
    const bad = [0, 1, 2].find(i => !answer(b).includes(i));
    b = dispatch(b, bad);
    assert(validWatch(b));
    assert.equal(b.parcel.via, undefined);
    b = collect(start(b));
    b = collect(start(dispatch(b, answer(b)[0])));
    b = dispatch(b, (answer(b)[0] + 1) % 3);
    assert(validWatch(b)); assert.equal(b.deliveries, undefined);
    b = collect(start(b));
    b = dispatch(b, answer(b)[0]);
    const receipt = b.history[0];
    b = accept(start(b), 1);
    b = act(b, 'radio', { site: 0 });
    assert.equal(b.radioSite, 0); assert.equal(b.samples, 0); assert(validWatch(b));
    assert.equal(act(b, 'radio', { site: 1 }), b);
    b = act(act(b, 'sample', { site: 1 }), 'sample', { site: 2 });
    assert.equal(b.samples, 6);
    const after = dispatch(b, answer(b)[0]);
    assert.equal(after.history[0].repaired, 0);
    assert.equal(after.radioSite, undefined);
    assert.deepEqual(after.history[1], receipt);
    assert.equal(validWatch({ ...after, parcel: { ...after.parcel, via: 42 } }), false);
    assert.equal(validWatch({ ...after, returnTrips: [9,9,9,9,9,9] }), false);
  });
});
