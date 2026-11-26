const frame = document.querySelector('iframe');
const report = document.querySelector('#report');
const storageKey = 'yunshenchu.observer.v4';
const legacyKey = 'yunshenchu.observer.v2';
const caseAnswers = {
  guixu: ['physical-island', 'range-second', 'camera-shadow'],
  'abyss-whale': ['undercloud', 'pressure-lower', 'shift-direction'],
  'ghost-rail': ['sealed-permit', 'rail-key', 'rail-permit'],
  'core-heartbeat': ['on-subscribe', 'core-focus', 'core-pulse'],
  'observer-return': ['preceded-input', 'observer-packet', 'observer-input'],
};
const signalIds = Object.keys(caseAnswers);
const instrumentSteps = { guixu: 3, 'abyss-whale': 2, 'ghost-rail': 3, 'core-heartbeat': 3, 'observer-return': 3 };
const manifestAnswers = {
  position: 'range-second', authority: 'rail-permit', cue: 'pressure-match', connection: 'core-focus', passenger: 'observer-packet',
};
const filedFixture = () => ({
  schemaVersion: 4,
  discoveredSignalIds: [...signalIds].reverse(),
  latestSignalId: 'observer-return',
  diary: [],
  departureDecision: null,
  completedInvestigationActions: {
    guixu: ['inspect-foundation', 'trace-guixu', 'review-camera', 'file-finding'],
    'abyss-whale': ['inspect-foundation', 'trace-abyss', 'review-citizens', 'file-finding'],
    'ghost-rail': ['inspect-apex', 'trace-ghost-rail', 'review-archive', 'file-finding'],
    'core-heartbeat': ['inspect-mid-ring', 'trace-core', 'review-systems', 'file-finding'],
    'observer-return': ['trace-observer', 'review-memory', 'review-diary', 'file-finding'],
  },
});
const viewports = [[1366, 768], [1280, 720], [430, 932], [390, 844], [320, 568], [844, 390]];
const failures = [];
const browserErrors = [];
const publish = (message, passed) => fetch('/results', { method: 'POST', body: JSON.stringify({ message, passed }) });

const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const find = (selector) => frame.contentDocument?.querySelector(selector);
const saved = () => JSON.parse(localStorage.getItem(storageKey));
const click = (selector) => {
  const target = find(selector);
  check(target && !target.disabled, `Unavailable control: ${selector}`);
  target.click();
};
const waitFor = async (condition, label) => {
  let remaining = 12_000;
  while (remaining > 0) {
    if (document.hidden) {
      await new Promise(resolve => document.addEventListener('visibilitychange', resolve, { once: true }));
      continue;
    }
    if (condition()) return;
    const before = performance.now();
    await wait(30);
    if (!document.hidden) remaining -= performance.now() - before;
  }
  throw new Error(`Timed out waiting for ${label}`);
};
let navigation = 0;
const loadTitle = async (path = '/YunShenChu/', target = frame, verifyStartup = false) => {
  navigation += 1;
  const destination = `${path}?run=${navigation}`;
  target.src = destination;
  await waitFor(() => target.contentWindow.location.href.endsWith(destination) && target.contentDocument?.readyState === 'complete', 'application document');
  target.contentWindow.addEventListener('error', (event) => browserErrors.push(event.message));
  target.contentWindow.addEventListener('unhandledrejection', (event) => browserErrors.push(String(event.reason)));
  const enterGame = () => target.contentDocument.querySelector('.title-play');
  await waitFor(enterGame, 'title screen');
  if (verifyStartup) {
    check(enterGame().textContent.includes('开始调查'), 'A new investigation is launched from the title screen');
    await waitFor(() => target.contentDocument.querySelector('.title-art')?.naturalWidth > 0, 'title art loaded');
  }
  return enterGame();
};
const open = async (path = '/YunShenChu/', target = frame, verifyStartup = false) => {
  const start = await loadTitle(path, target, verifyStartup);
  start.click();
  await waitFor(() => target.contentDocument.querySelector('.observer-console'), 'startup');
  // Tests using open() begin on the field, including when a late-game save opens its worksheet first.
  const close = target.contentDocument.querySelector('dialog[open] [data-dialog-focus]');
  if (close) {
    close.click();
    await waitFor(() => !target.contentDocument.querySelector('dialog[open]'), 'resumed worksheet closes');
  }
  await wait(50);
};
const unload = async () => {
  frame.src = 'about:blank';
  await waitFor(() => frame.contentWindow.location.href === 'about:blank', 'previous session closes');
};
const enter = (selector, value, target = frame) => {
  const element = target.contentDocument.querySelector(selector);
  const win = target.contentWindow;
  Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new win.Event('input', { bubbles: true }));
};
const key = (element, value, modifiers = {}) => {
  element.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...modifiers }));
};
const select = (selector, value) => {
  const element = find(selector);
  element.value = value;
  element.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true }));
};
const selectMarker = async (selector) => {
  click(selector);
  await waitFor(() => find(`${selector}[aria-pressed="true"]`), `selected marker ${selector}`);
};
const waitForModalClose = async (label) => {
  await waitFor(() => !find('dialog') && !find('.observer-shell.has-modal'), label);
  // WebKit releases the native modal focus scope after the React teardown.
  await wait(90);
};
const capture = async (id, previousCount) => {
  await waitFor(() => find('#capture-title'), `instrument for ${id}`);
  switch (id) {
    case 'guixu':
      await waitFor(() => find('.capture-photo img')?.naturalWidth > 0, 'buffered camera still loads from the project path');
      await selectMarker('.capture-first button[data-feature="gantry"]');
      await selectMarker('.capture-second button[data-feature="veil"]');
      break;
    case 'abyss-whale':
      await selectMarker('[data-sample="lower-noise"]');
      await selectMarker('[data-sample="upper-front"]');
      break;
    case 'ghost-rail':
      enter('[name="permit-code"]', 'A9-VOID');
      break;
    case 'core-heartbeat':
      click('[data-trial="redraw"]');
      await waitFor(() => find('.capture-trials')?.textContent.includes('电流平稳'), 'local test sampled');
      click('[data-trial="subscribe"]');
      await waitFor(() => find('.capture-trials')?.textContent.includes('电流出现尖峰'), 'live test sampled');
      click('input[name="bus-trial"][value="redraw"]');
      break;
    case 'observer-return':
      check(find('.capture-confirm').disabled, 'clock cannot be corrected before the archive is sampled');
      click('.clock-reference button');
      await waitFor(() => find('.temporal-active') && find('.clock-reference')?.textContent.includes('初代档案'), 'historical receiver reference opened');
      click('.clock-reference button:first-child');
      await waitFor(() => find('.clock-reference [role="status"]'), 'archive reference copied');
      click('.clock-reference .capture-actions button:nth-child(2)');
      await waitFor(() => !find('.temporal-active') && find('[name="clock-correction"]'), 'live diary shows both reference pulses');
      select('[name="clock-correction"]', '100');
      break;
  }
  await waitFor(() => !find('.capture-confirm')?.disabled, 'sample can be submitted');
  click('.capture-confirm');
  await waitFor(() => find('.capture-body .case-feedback'), 'wrong capture rejected');
  check(saved().completedInvestigationActions[id].length === previousCount, 'Wrong capture should leave the field record locked');

  switch (id) {
    case 'guixu': await selectMarker('.capture-second button[data-feature="gantry"]'); break;
    case 'abyss-whale': await selectMarker('[data-sample="lower-front"]'); break;
    case 'ghost-rail': enter('[name="permit-code"]', 'a9-null'); break;
    case 'core-heartbeat': click('input[name="bus-trial"][value="subscribe"]'); break;
    case 'observer-return': select('[name="clock-correction"]', '-100'); break;
  }
  await waitFor(() => !find('.capture-body .case-feedback'), 'corrected capture is ready');
  click('.capture-confirm');
  await waitFor(() => find('.capture-success'), 'record confirmed');
  click('.capture-return');
  await waitForModalClose('instrument closed');
};
const rehearse = async (id) => {
  const progress = JSON.stringify(saved().completedInvestigationActions);
  click('.case-resolution .case-secondary');
  await waitFor(() => find('.capture-desk .case-header span')?.textContent.includes('练习'), `rehearsal for ${id}`);
  switch (id) {
    case 'guixu':
      await selectMarker('.capture-first button[data-feature="sill"]');
      await selectMarker('.capture-second button[data-feature="sill"]');
      break;
    case 'abyss-whale':
      await selectMarker('[data-sample="practice-lower-2"]');
      await selectMarker('[data-sample="practice-upper-3"]');
      break;
    case 'ghost-rail':
      check(find('.capture-card[aria-label="道岔日志"]').textContent.includes('R22-M37'), 'rehearsal uses a different permit');
      enter('[name="permit-code"]', 'R22-M37');
      break;
    case 'core-heartbeat':
      click('[data-trial="redraw"]');
      await waitFor(() => find('.capture-trials')?.textContent.includes('电流出现尖峰'), 'rehearsal reverses the pulsing trial');
      click('[data-trial="subscribe"]');
      await waitFor(() => find('.capture-trials')?.textContent.includes('电流平稳'), 'other trial sampled');
      click('input[name="bus-trial"][value="redraw"]');
      break;
    case 'observer-return':
      select('[name="clock-correction"]', '-200');
      break;
  }
  await waitFor(() => !find('.capture-confirm')?.disabled, 'rehearsal ready');
  click('.capture-confirm');
  await waitFor(() => find('.capture-success')?.textContent.includes('练习通过'), 'rehearsal verified');
  if (id === 'ghost-rail') {
    click('.capture-new');
    await waitFor(() => find('.capture-card[aria-label="道岔日志"]')?.textContent.includes('R23-M38'), 'new rehearsal uses a new sample');
    click('.capture-close');
  } else {
    click('.capture-return');
  }
  await waitFor(() => find('.case-resolution'), 'returned to the filed finding');
  check(JSON.stringify(saved().completedInvestigationActions) === progress, 'Rehearsal should leave case progress intact');
};
const fileLoadedCase = async (id) => {
  const [theory, first, second] = caseAnswers[id];
  click(`input[name="theory"][value="${theory}"]`);
  click(`input[name="citation"][value="${first}"]`);
  await waitFor(() => find(`input[value="${first}"]:checked`), 'first citation selected');
  click(`input[name="citation"][value="${second}"]`);
  await waitFor(() => !find('.case-submit').disabled, 'finding supported');
  click('.case-submit');
  await waitFor(() => saved()?.completedInvestigationActions[id]?.includes('file-finding'), `${id} filed`);
  click('.case-close');
  await waitForModalClose('case closed');
};
let currentCheck = 'starting';
const run = async (label, verify) => {
  currentCheck = label;
  await publish('Checking ' + label);
  let result;
  try {
    await verify();
    result = `PASS  ${label}`;
  } catch (error) {
    failures.push(error.message);
    const state = find('dialog')?.getAttribute('aria-labelledby')
      ?? find('.strip-next-action')?.getAttribute('aria-label')
      ?? frame.contentWindow.location.pathname;
    result = `FAIL  ${label}: ${error.message} [${state}]`;
  }
  report.textContent += `\n${result}`;
  report.scrollTop = report.scrollHeight;
  await publish(result);
};

document.addEventListener('visibilitychange', () => {
  void publish('Test page ' + document.visibilityState + ' during ' + currentCheck);
});
window.addEventListener('error', event => {
  void publish('Test page error during ' + currentCheck + ': ' + event.message, false);
});
window.addEventListener('unhandledrejection', event => {
  void publish('Test page rejection during ' + currentCheck + ': ' + event.reason, false);
});

await publish(`Browser connected (${document.visibilityState}): ${navigator.userAgent}`);
await run('Night watch carries samples across reload, repairs the third district, and hands off to the next shift', async () => {
  await open();
  click('.watch-entry');
  await waitFor(() => find('.night-watch'), 'watch desk');
  click('[data-stop="0"]');
  click('.watch-primary');
  await waitFor(() => saved()?.nightWatch?.samples === 1, 'first sample saved');
  frame.contentWindow.location.reload();
  await waitFor(() => find('.watch-route [data-stop="1"][aria-pressed="true"]'), 'resume at next unsampled station');
  click('.watch-primary');
  await waitFor(() => saved()?.nightWatch?.samples === 3, 'second sample');
  click('.watch-back');
  await waitFor(() => find('.console-menu'), 'field console after gathering two samples');
  click('.console-menu');
  await waitFor(() => find('.title-watch')?.textContent.includes('可开调度单'), 'title shows resumable dispatch');
  check(find('.title-replay'), 'A watch-only save can use a separate slot');
  click('.title-watch');
  await waitFor(() => find('.watch-paper h2') === frame.contentDocument.activeElement, 'resumed watch focuses available dispatch');
  check(saved().nightWatch.samples === 3, 'Resume keeps the third crew in reserve');
  for (const [width, height] of [[1324, 780], [1024, 768]]) {
    frame.width = width;
    frame.height = height;
    await waitFor(() => frame.contentWindow.innerWidth === width, 'dispatch viewport sized');
    const box = selector => find(selector).getBoundingClientRect();
    for (const [left, right] of [
      ['.watch-route', '.watch-tabs'], ['.watch-photo', '.watch-page-body'], ['.watch-action', '.watch-dispatch-actions'],
    ]) {
      const a = box(left), b = box(right);
      check(Math.abs(a.top - b.top) <= 1 && Math.abs(a.bottom - b.bottom) <= 1, 'Both sides of the dispatch desk align at ' + width);
    }
    check(box('.watch-submit').bottom <= height && box('.watch-orders label:last-child').bottom <= box('.watch-dispatch-actions').top,
      'All three orders and the send button are visible at ' + width);
  }
  frame.width = 1366;
  frame.height = 768;
  const [first, second] = [...frame.contentDocument.querySelectorAll('.watch-readings strong')].map(e => Number(e.textContent.slice(-2)));
  const choice = first === second ? 2 : first < second ? 0 : 1;
  click('.watch-orders input[value="' + choice + '"]');
  await waitFor(() => !find('.watch-submit').disabled, 'dispatch enabled');
  click('.watch-submit');
  await waitFor(() => saved()?.nightWatch?.works[2] === 1 && find('.watch-result'), 'down-ring repair');
  check(find('.watch-caption').textContent.includes('接通引路灯'), 'Completed project appears in the scene');
  click('.watch-paper .watch-text');
  await waitFor(() => find('.watch-project[open] > summary')?.textContent.includes('下环'), 'receipt opens the repaired district');
  check(find('.watch-project[open] blockquote')?.textContent.includes('下一阶'), 'Resident letter matches the work just finished');
  await waitFor(() => find('.watch-paper h2') === frame.contentDocument.activeElement, 'Street works heading receives focus after the receipt link');
  click('.watch-result .watch-primary');
  await waitFor(() => saved()?.nightWatch?.number === 2 && saved().nightWatch.open, 'next watch accepted');
  click('.watch-back');
  await waitFor(() => find('.watch-city-letter')?.textContent.includes('引路灯'), 'repair carried back into the investigation notebook');
  await unload();
  localStorage.removeItem(storageKey);
});

await run('Targeted scanning, inert background, and focus return', async () => {
  await open('/YunShenChu/', frame, true);
  const districtTab = find('#inspector-tab-district');
  districtTab.focus();
  key(districtTab, 'ArrowRight');
  await waitFor(() => find('#inspector-tab-systems[aria-selected="true"]'), 'keyboard tab selection');
  click('#inspector-tab-archive');
  await waitFor(() => find('#inspector-panel-archive'), 'archive panel');
  const opener = '[aria-label="查阅案卷 · 核心心跳"]';
  click(opener);
  await waitFor(() => find('dialog[open]'), 'interceptor open');
  check(!find('.signal-presets') && !find('.interceptor-panel').textContent.includes('132.8 MHz'), 'Sealed scan does not reveal a preset');
  check(find('.nearest-signal').textContent.includes('目标信号在高频一侧'), 'Manual guidance should point to the selected sealed signal');
  key(find('.freq-slider'), 'Home');
  await waitFor(() => find('.frequency-value')?.textContent === '80.0', 'receiver band minimum');
  check(find('.tune-step').disabled, 'The receiver must stay within its band');
  click('.tune-step:last-child');
  await waitFor(() => find('.frequency-value')?.textContent === '80.1', 'a single manual tuning step');
  check(frame.contentDocument.activeElement === find('.interceptor-close-btn'), 'Interceptor should focus its close control');
  find('#inspector-tab-archive').focus();
  check(frame.contentDocument.activeElement === find('.interceptor-close-btn'), 'Modal background should be inert');
  click('.scan-btn');
  await waitFor(() => saved()?.discoveredSignalIds.includes('core-heartbeat'), 'targeted signal lock');
  check(saved().discoveredSignalIds.length === 1, 'Sweep should only record the target band');
  click('.interceptor-close-btn');
  await waitFor(() => !find('dialog[open]'), 'interceptor close');
  check(frame.contentDocument.activeElement === find(opener), 'Closing should restore focus to the archive card');
  click('.archive-case-link');
  await waitFor(() => find('.case-ticket-pending'), 'an early case file');
  check(!find('input[name="citation"]') && find('.case-submit').disabled, 'Uncaptured details and filing must be locked');
  click('.case-close');
  await waitForModalClose('early case file closed');
});

await run('Five instruments, five rehearsal variants and all findings', async () => {
  await unload();
  localStorage.removeItem(storageKey);
  await open();
  for (const id of signalIds) {
    click('#signal-toolbar-trigger');
    await waitFor(() => find('.scan-btn'), 'interceptor scan control');
    click('.scan-btn');
    await waitFor(() => saved()?.discoveredSignalIds.includes(id), `signal ${id}`);
    click('.interceptor-close-btn');
    await waitForModalClose('interceptor releases background');

    for (let count = 1; count <= 3; count += 1) {
      await waitFor(() => find('.strip-next-action'), `guided action ${count} for ${id}`);
      if (id === 'guixu' && count === 3) {
        click('.camera-launch');
        await waitFor(() => find('.camera-caption'), 'camera preview opens');
        check(saved().completedInvestigationActions[id].length === 2, 'Camera preview cannot capture the record');
        click('.close-camera-btn');
        await waitForModalClose('preview closes');
      }
      click('.strip-next-action');
      if (instrumentSteps[id] === count) await capture(id, count - 1);
      if (id === 'abyss-whale' && count === 3) {
        await waitFor(() => find('.feed-witness-capture'), 'witness statement offered');
        check(find('.feed-witness').textContent.includes('先是脚下的格栅'), 'Pulse should show the evidence to be filed');
        check(saved().completedInvestigationActions[id].length === 2, 'Opening the witness feed must leave the interview unfiled');
        click('.feed-witness-capture');
      }
      await waitFor(() => saved()?.completedInvestigationActions[id]?.length === count, `${id} action ${count}`);
      if (find('.close-camera-btn')) {
        check(find('.camera-caption')?.textContent.includes('corroborated'), 'Camera evidence should precede the finding');
        await waitFor(() => find('.camera-feed-still img')?.naturalWidth > 0, 'buffered camera still loads from the project path');
        click('.close-camera-btn');
        await waitFor(() => !find('dialog[open]'), 'camera releases background');
      }
      if (find('[aria-label="收起深层终端"]')) {
        click('[aria-label="收起深层终端"]');
        await waitFor(() => !find('.deep-terminal-container.open'), 'terminal closes');
      }
      if (find('[aria-label="Close observer diary"]')) {
        click('[aria-label="Close observer diary"]');
        await waitFor(() => !find('.observer-diary-drawer.open'), 'diary closes');
      }
    }
    check(!saved().completedInvestigationActions[id].includes('file-finding'), 'Capturing evidence must not file a finding');
    if (id === 'guixu') {
      click('[aria-label="打开深层终端"]');
      await waitFor(() => find('.deep-terminal-container.open'), 'terminal opens for a bypass attempt');
      enter('.terminal-input', 'complete file-finding');
      find('.terminal-input-form').requestSubmit();
      await waitFor(() => find('.terminal-output')?.textContent.includes('待结案'), 'terminal blocks filing without proof');
      click('[aria-label="收起深层终端"]');
      await waitFor(() => !find('.deep-terminal-container.open'), 'terminal closes after the attempted bypass');
    }
    click('.strip-next-action');
    await waitFor(() => find('#case-desk-title'), `case file for ${id}`);
    const [theory, firstReading, secondReading] = caseAnswers[id];
    if (id === 'guixu') {
      click('input[name="theory"][value="grid-ghost"]');
      click('input[name="citation"][value="range-first"]');
      await waitFor(() => find('input[value="range-first"]:checked'), 'first citation selected');
      click(`input[name="citation"][value="${secondReading}"]`);
      await waitFor(() => !find('.case-submit').disabled, 'finding ready with two readings');
      click('.case-submit');
      await waitFor(() => find('.case-feedback')?.textContent.includes('导航网格重启后'), 'wrong explanation rejected');
      check(saved().completedInvestigationActions[id].length === 3, 'Wrong answer should leave progress unchanged');
      click('.case-close');
      await waitForModalClose('draft case closed for another look at the city');
      await open();
      click('.strip-next-action');
      await waitFor(() => find('input[value="grid-ghost"]:checked') && find('input[value="range-first"]:checked')
        && find(`input[value="${secondReading}"]:checked`), 'working theory and citations restored in the same tab');
      click(`input[name="theory"][value="${theory}"]`);
      await waitFor(() => find(`input[name="theory"][value="${theory}"]:checked`), 'updated explanation selected');
      click('.case-submit');
      await waitFor(() => find('.case-feedback')?.textContent.includes('两份独立记录'), 'unsupported explanation rejected');
    } else {
      click(`input[name="theory"][value="${theory}"]`);
    }
    click(`input[name="citation"][value="${firstReading}"]`);
    await waitFor(() => find(`input[value="${firstReading}"]:checked`), 'supporting reading selected');
    if (id !== 'guixu') click(`input[name="citation"][value="${secondReading}"]`);
    await waitFor(() => !find('.case-submit').disabled, 'supported finding ready');
    click('.case-submit');
    await waitFor(() => saved()?.completedInvestigationActions[id]?.includes('file-finding'), `finding filed for ${id}`);
    await waitFor(() => find('.case-resolution .case-secondary'), 'filed case opens its rehearsal');
    check(sessionStorage.getItem(storageKey + '.case.' + id) === null, 'Filing retires the worksheet draft');
    await rehearse(id);
    if (id === signalIds.at(-1)) {
      await waitFor(() => find('.case-resolution .case-submit'), 'cross-case dispatch unlocked');
      click('.case-resolution .case-submit');
      await waitFor(() => find('#departure-title')?.textContent === 'Q-17 发车单', 'cross-case narrative');
    }
    click('.case-close');
    await waitForModalClose('case file closes');
    void publish(`Contained ${id}`);
  }
  check(!find('.strip-next-action'), 'All five investigations should be complete');
  await open();
  click('#inspector-tab-archive');
  await waitFor(() => frame.contentDocument.querySelectorAll('.investigation-strip.stage-contained').length === signalIds.length, 'all contained threads after reload');
  click('.field-chronology summary');
  const times = [...frame.contentDocument.querySelectorAll('.field-chronology time')].map(({ textContent }) => textContent);
  check(times.length === 15 && times.join() === [...times].sort().join(), 'Field log contains all records in recorded order');
  click('.field-chronology li:first-child button');
  await waitFor(() => find('#case-desk-title')?.textContent.includes('归墟'), 'field log opens its source case');
  click('.case-close');
  await waitFor(() => !find('dialog[open]'), 'field log case closes');
  click('.archive-filter-bar button:nth-child(3)');
  await waitFor(() => find('.archive-empty-state'), 'empty sealed filter');
  click('.archive-filter-bar button:first-child');
  await waitFor(() => find('.discovery-card'), 'all-thread filter');
  enter('input[type="search"]', 'ghost-rail');
  await waitFor(() => frame.contentDocument.querySelectorAll('.discovery-card').length === 1, 'archive search');
  check(find('.discovery-card').textContent.includes('幽灵轨道'), 'Archive search returned the expected thread');
});

await run('Five linked records unlock both dispatch decisions, which restore on the map and receipt', async () => {
  const completedStory = saved()?.completedInvestigationActions['observer-return']?.includes('file-finding') ? saved() : filedFixture();
  for (const [choice, directive] of [
    ['hold', '零号月台继续由人工压车'],
    ['clear', '在下环目送 Q-17 发车'],
  ]) {
    await unload();
    sessionStorage.removeItem(`${storageKey}.manifest.v1`);
    localStorage.setItem(storageKey, JSON.stringify({ ...completedStory, departureDecision: null }));
    await open();
    click('.map-toggle');
    await waitFor(() => find('.city-window.view-map'), 'map view selected');
    check(find('.strip-dispatch').textContent.includes('打开最终调度单'), 'The final dispatch is available from the investigation dock');
    click('#inspector-tab-archive');
    await waitFor(() => find('.archive-departure-link'), 'cross-case dispatch is available');
    click('.archive-departure-link');
    await waitFor(() => find('.manifest-workbench'), 'manifest must be reconstructed');
    check(!find('.departure-response') && find('.manifest-verify').disabled, 'A partial manifest must not authorize a departure');
    for (const [field, reading] of Object.entries(manifestAnswers)) {
      select(`#manifest-${field}`, choice === 'hold' && field === 'cue' ? 'pressure-upper' : reading);
    }
    click('.manifest-verify');
    if (choice === 'hold') {
      await waitFor(() => find('.manifest-result')?.textContent.includes('已核实 4/5'), 'the incorrect source is flagged');
      check(find('.manifest-slot.needs-review')?.textContent.includes('重复间隔'), 'Feedback explains which evidence to revisit');
      check(saved().departureDecision === null && !find('.departure-response'), 'A rejected manifest must leave the ending unavailable');
      click('.case-close');
      await waitForModalClose('manifest closes');
      click('.archive-departure-link');
      await waitFor(() => find('#manifest-cue')?.value === 'pressure-upper', 'manifest draft restores after reopening');
      select('#manifest-cue', manifestAnswers.cue);
      click('.manifest-verify');
    }
    await waitFor(() => find('.departure-response'), 'departure choices');
    check(find('.departure-manifest-review').textContent.includes('Q-17 · 当班观察者'), 'The reconstructed packet identifies the passenger');
    if (choice === 'hold') {
      await open();
      click('.map-toggle');
      await waitFor(() => find('.city-window.view-map'), 'restored map view selected');
      click('.strip-dispatch');
      await waitFor(() => find('.departure-response'), 'verified manifest restores after refresh');
    }
    click(`input[name="departure-choice"][value="${choice}"]`);
    await waitFor(() => !find('.departure-response .case-submit').disabled, 'departure choice selected');
    click('.departure-response .case-submit');
    await waitFor(() => saved()?.departureDecision?.choice === choice, 'departure decision saved');
    check(find('.departure-receipt')?.textContent.includes(directive), 'Receipt should reflect the transmitted choice');
    check(find('.departure-scene h3')?.textContent.includes(choice === 'hold' ? '月台的灯没有亮' : '末班车驶入云中'), 'Ending should reflect the transmitted choice');
    await waitFor(() => find('.departure-scene img')?.naturalWidth > 0, 'ending art');
    check(find(`.map-3d-container.departure-${choice}`), 'Map state should reflect the transmitted choice');
    check(find('.signal-strip')?.textContent.includes(directive), 'Active directive should reflect the transmitted choice');

    await open();
    check(find('.strip-dispatch').textContent.includes('重读结局'), 'The ending is available again after loading');
    click('#inspector-tab-archive');
    await waitFor(() => find('.archive-departure-link'), 'dispatch available after reloading');
    click('.archive-departure-link');
    await waitFor(() => find('.departure-receipt')?.textContent.includes(directive), 'dispatch receipt restored');
    check(!find('.departure-response'), 'Final choice should remain filed after reloading');
    click('.departure-return');
    await waitForModalClose('returned to the city');
  }
});

await run('Title screen resumes the original and keeps replay progress separate', async () => {
  const original = saved();
  const replayKey = 'yunshenchu.observer.replay.v4';
  localStorage.removeItem(replayKey);
  click('.console-menu');
  await waitFor(() => find('.title-play'), 'title screen returns');
  check(find('.title-play').textContent.includes('重返云城'), 'Completed original is resumable from the title');
  click('.title-replay');
  await waitFor(() => frame.contentWindow.location.search.includes('replay') && find('.title-play'), 'separate replay loads');
  check(find('.title-play').textContent.includes('开始调查'), 'Replay has no original discoveries');
  click('.title-play');
  await waitFor(() => find('.observer-console'), 'replay started');
  click('#signal-toolbar-trigger');
  await waitFor(() => find('.scan-btn'), 'replay interceptor opens');
  click('.scan-btn');
  await waitFor(() => JSON.parse(localStorage.getItem(replayKey))?.discoveredSignalIds.includes('guixu'), 'first replay carrier saved');
  check(JSON.stringify(saved().departureDecision) === JSON.stringify(original.departureDecision), 'The original ending remains unchanged');
  await open();
  check(find('.strip-dispatch')?.textContent.includes('重读结局'), 'The original ending can still be read');
});

await run('Command palette, terminal completion, and coordinated drawers', async () => {
  await open();
  key(frame.contentWindow, 'k', { ctrlKey: true });
  await waitFor(() => find('.command-palette'), 'keyboard command palette');
  enter('.command-palette input', 'terminal');
  await waitFor(() => frame.contentDocument.querySelectorAll('.palette-list button').length === 1, 'palette filtering');
  click('.palette-list button');
  await waitFor(() => find('.deep-terminal-container.open'), 'palette opens terminal');
  enter('.terminal-input', 'wor');
  await waitFor(() => find('.terminal-suggestion'), 'terminal suggestion');
  key(find('.terminal-input'), 'Tab');
  await waitFor(() => find('.terminal-input').value === 'world_status', 'Tab command completion');
  find('.terminal-input-form').requestSubmit();
  await waitFor(() => find('.terminal-output')?.textContent.includes('WORLD STATUS:'), 'terminal response');
  click('[aria-label="Open observer diary"]');
  await waitFor(() => find('.observer-diary-drawer.open'), 'diary opens');
  check(!find('.deep-terminal-container.open'), 'Opening the diary should close the terminal drawer');
  const location = find('.diary-location-filter select');
  check(location.options.length > 1, 'Diary should expose recorded locations');
  location.selectedIndex = 1;
  location.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true }));
  await waitFor(() => [...frame.contentDocument.querySelectorAll('.entry-location')].every((entry) => entry.textContent.trim() === location.value), 'diary location filter');
  click('[aria-label="Close observer diary"]');
});

await run('District exteriors decode and the Year 01 map restores the live district', async () => {
  await open();
  const districts = [
    ['apex', 'apex'],
    ['mid_ring', 'midring'],
    ['foundation', 'foundation'],
  ];
  const readExterior = async (district, asset) => {
    const selector = `.city-window.view-exterior[data-district="${district}"] img.city-panorama:not([hidden])`;
    const assetPrefix = `/assets/district-${asset}-`;
    await waitFor(() => {
      const image = find(selector);
      if (!image?.complete || !image.naturalWidth) return false;
      const path = new URL(image.currentSrc || image.src).pathname;
      return path.includes(assetPrefix) && path.endsWith('.jpg');
    }, `${district} exterior image loads`);
    const image = find(selector);
    await image.decode();
    check(image.naturalWidth > 0 && image.naturalHeight > 0, `${district} exterior decodes`);
    check(image.alt.trim().length > 0, `${district} exterior has alternative text`);
    const visibleExteriors = [...frame.contentDocument.querySelectorAll('.city-window img.city-panorama')]
      .filter((candidate) => candidate.getClientRects().length > 0);
    check(visibleExteriors.length === 1 && visibleExteriors[0] === image, 'Only the selected district exterior is visible');
    return { source: image.currentSrc || image.src, alt: image.alt.trim() };
  };

  const exteriors = [];
  for (const [index, [district, asset]] of districts.entries()) {
    click(`.rail-district:nth-of-type(${index + 1})`);
    exteriors.push(await readExterior(district, asset));
  }
  check(new Set(exteriors.map(({ source }) => source)).size === districts.length, 'Each district has a distinct exterior image');
  check(new Set(exteriors.map(({ alt }) => alt)).size === districts.length, 'Each district exterior has a distinct description');

  click('.rail-district:nth-of-type(2)');
  await readExterior('mid_ring', 'midring');
  click('[title="查看初代城区"]');
  await waitFor(() => find('.temporal-active .city-window.view-map[data-district="foundation"] .map-3d-container'), 'Year 01 terrain map');
  check(!find('.city-window img.city-panorama:not([hidden])'), 'The Year 01 viewport should contain only historical terrain');
  const archiveTerrain = frame.contentDocument.querySelectorAll('.city-window.view-map .island');
  check(archiveTerrain.length === 1 && archiveTerrain[0].classList.contains('district-foundation'), 'Year 01 contains the Foundation prototype');
  const energy = () => find('.top-metric:nth-child(1) strong').textContent;
  check(energy() === '62.4%', 'Archive should expose the historical energy index');
  await wait(5300);
  check(energy() === '62.4%', 'Live ecology should not overwrite the archive view');
  click('[title="返回实时城区"]');
  const restored = await readExterior('mid_ring', 'midring');
  check(restored.source === exteriors[1].source && restored.alt === exteriors[1].alt, 'Leaving Year 01 restores the Mid-Ring exterior');
});

await run('Each district shows a visible local lead and routes its own evidence', async () => {
  const original = saved();
  await unload();
  localStorage.removeItem(storageKey);
  await open();
  const sectors = [
    ['apex', 'ghost-rail', '凌霄枢纽', '监听道岔信号'],
    ['mid_ring', 'core-heartbeat', '浮光市集', '监听供电波形'],
    ['foundation', 'guixu', '下层维护栈桥', '追踪云下回波'],
  ];
  for (const [width, height] of viewports) {
    frame.width = width;
    frame.height = height;
    await waitFor(() => frame.contentWindow.innerWidth === width, 'resized console');
    for (const [i, [district, id, site, label]] of sectors.entries()) {
      click(`.rail-district:nth-of-type(${i + 1})`);
      await waitFor(() => find(`.city-window[data-district="${district}"] .site-observation[data-lead="${id}"]`), site);
      check(find('.scene-caption h2').textContent === site, 'Scene title follows district');
      const primary = find('.site-primary');
      const box = primary.getBoundingClientRect();
      const dock = find('.signal-strip').getBoundingClientRect();
      check(primary.textContent.includes(label) && box.height >= 44 && box.y >= 0 && box.bottom <= dock.top,
        `Local action should fit above dock at ${width}×${height} in ${site}`);
      check(frame.contentDocument.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('button') === primary,
        `Local action should receive taps at ${width}×${height} in ${site}`);
      click('.scene-waypoint');
      await waitFor(() => find('.city-window[data-distance="near"] .local-fragment'), 'approach observation point');
      const back = find('.scene-waypoint').getBoundingClientRect();
      const tools = find('.window-toolbar').getBoundingClientRect();
      check(back.right <= tools.left || back.bottom <= tools.top || back.top >= tools.bottom,
        `Return and instrument controls overlap at ${width}×${height}`);
      click('.scene-waypoint');
      await waitFor(() => find('.city-window[data-distance="far"]'), 'leave observation point');
    }
  }
  frame.width = 390;
  frame.height = 844;
  for (const [i, [, id, site]] of sectors.entries()) {
    click(`.rail-district:nth-of-type(${i + 1})`);
    await waitFor(() => find('.site-observation').dataset.lead === id, site);
    click('.scene-waypoint');
    await waitFor(() => find('.city-window[data-distance="near"] img.city-panorama')?.src.includes('camera-'), 'approach the local source');
    check(find('.local-fragment cite')?.textContent.length > 0, 'A local voice or field reading accompanies the close view');
    check(!saved()?.discoveredSignalIds.includes(id), 'Looking around must not lock a signal');
    click('.scene-waypoint');
    await waitFor(() => find('.city-window[data-distance="far"] img.city-panorama')?.src.includes('district-'), 'return to exterior');
    click('.site-primary');
    await waitFor(() => find('.interceptor-title h2') && find('.nearest-signal')?.textContent.includes('调'), 'local receiver tuned to the site');
    click('.scan-btn');
    await waitFor(() => saved()?.discoveredSignalIds.includes(id), `local carrier ${id}`);
    check(saved().discoveredSignalIds.length === i + 1, 'The sweep should lock only its local lead');
    click('.site-resume');
    await waitForModalClose('return to the local observation');
    await waitFor(() => find('.city-window[data-distance="near"] .local-fragment cite'), 'local document on return');
    await waitFor(() => find('.site-observation')?.dataset.stage === 'detected', 'local lock');
    check(frame.contentDocument.activeElement === find('.site-primary'), 'Scanner returns focus to local action');
    click('.site-primary');
    await waitFor(() => find('.site-observation')?.dataset.stage === 'corroborated', 'local record collected');
    check(saved().completedInvestigationActions[id].length === 1, 'Capture the selected site record');
  }
  await open();
  check(find('.site-observation').dataset.lead === 'guixu' && find('.site-observation').dataset.stage === 'corroborated',
    'Reload resumes the current investigation at its site');
  const filed = filedFixture();
  await unload();
  localStorage.setItem(storageKey, JSON.stringify(filed));
  await open();
  click('.rail-district:first-of-type');
  await waitFor(() => find('.site-observation[data-lead="ghost-rail"][data-stage="contained"]'), 'filed local case');
  click('.site-primary');
  await waitFor(() => find('.case-resolution'), 'local action revisits the filed finding');
  click('.case-close');
  await unload();
  if (original) localStorage.setItem(storageKey, JSON.stringify(original));
  else localStorage.removeItem(storageKey);
  frame.width = 1366;
  frame.height = 768;
  await open();
});

await run('Three distinct district cameras serve their bundled images', async () => {
  const previous = saved();
  await unload();
  localStorage.removeItem(storageKey);
  await open();
  const panes = ['apex', 'midring', 'foundation'];
  for (let index = 0; index < panes.length; index += 1) {
    click(`.rail-district:nth-of-type(${index + 1})`);
    await waitFor(() => find(`.rail-district:nth-of-type(${index + 1})[aria-pressed="true"]`), 'district selected');
    click('.camera-launch');
    await waitFor(() => {
      const still = find('.camera-feed-still img');
      return still?.src.includes(`camera-${panes[index]}-`) && still.naturalWidth === 1440;
    }, `${panes[index]} camera frame decodes`);
    const frameBox = find('.camera-feed-still').getBoundingClientRect();
    const captionBox = find('.camera-caption').getBoundingClientRect();
    check(frameBox.bottom <= captionBox.top, 'Caption should leave the camera image unobstructed');
    click('.close-camera-btn');
    await waitForModalClose(`${panes[index]} camera closes`);
  }
  await unload();
  if (previous) localStorage.setItem(storageKey, JSON.stringify(previous));
  await open();
});

await run('Live effects restore for open cases and release when the findings are filed', async () => {
  const original = saved();
  const fixture = filedFixture();
  const completed = fixture.completedInvestigationActions;
  for (const id of ['abyss-whale', 'core-heartbeat']) {
    completed[id] = completed[id].filter((actionId) => actionId !== 'file-finding');
  }
  await unload();
  localStorage.setItem(storageKey, JSON.stringify({
    ...fixture, latestSignalId: 'abyss-whale', completedInvestigationActions: completed,
  }));
  await open();
  click('#inspector-tab-systems');
  await waitFor(() => find('.weather-matrix')?.textContent.includes('云下压力波'), 'open vent anomaly restored');
  const energy = () => Number.parseFloat(find('.top-metric:nth-child(1) strong').textContent);
  check(energy() < 98.5, 'Open core anomaly should reduce live energy');

  click('.strip-next-action');
  await waitFor(() => find('#case-desk-title')?.textContent.includes('云下合唱'), 'vent finding opened');
  await fileLoadedCase('abyss-whale');
  check(!find('.weather-matrix')?.textContent.includes('云下压力波'), 'Filing should release the vent weather override');
  const withCorePulse = energy();
  click('.strip-next-action');
  await waitFor(() => find('#case-desk-title')?.textContent.includes('核心心跳'), 'core finding opened');
  await fileLoadedCase('core-heartbeat');
  check(energy() > withCorePulse, 'Filing should release the core energy reduction');

  await unload();
  if (original) localStorage.setItem(storageKey, JSON.stringify(original));
  else localStorage.removeItem(storageKey);
  await open();
});

await run('The field action follows the selected ring while the shortcut names its own investigation', async () => {
  await unload();
  localStorage.setItem(storageKey, JSON.stringify({
    ...filedFixture(), discoveredSignalIds: ['guixu', 'ghost-rail', 'core-heartbeat'], latestSignalId: 'core-heartbeat',
    completedInvestigationActions: {
      guixu: ['inspect-foundation', 'trace-guixu', 'review-camera', 'file-finding'],
      'ghost-rail': ['inspect-apex', 'trace-ghost-rail', 'review-archive'],
      'core-heartbeat': ['inspect-mid-ring'],
    },
  }));
  frame.width = 320;
  frame.height = 568;
  await open();
  const expected = [
    ['可交结论', 'ghost-rail', '提交调查结论'],
    ['已取证 1 / 3', 'core-heartbeat', '调取终端读数'],
    ['风井低鸣', 'abyss-whale', '监听通风井'],
  ];
  for (const [i, [sign, caseId, action]] of expected.entries()) {
    const rail = '.rail-district:nth-of-type(' + (i + 1) + ')';
    click(rail);
    await waitFor(() => find('.site-observation')?.dataset.lead === caseId, 'selected ring case');
    check(find(rail + ' small').textContent === sign && find('.site-primary').textContent.trim() === action, 'Site and local action match');
    const shortcut = find('.strip-next-action');
    check(shortcut.getAttribute('aria-label') === '中环 · 核心心跳，调取终端读数', 'Shortcut identifies the continuing case');
    for (const text of shortcut.querySelectorAll('small,strong')) {
      const box = text.getBoundingClientRect(), button = shortcut.getBoundingClientRect();
      check(box.width > 0 && box.left >= button.left && box.right <= button.right && box.top >= button.top && box.bottom <= button.bottom, 'Both lines fit the mobile shortcut');
    }
  }
  click('.site-primary');
  await waitFor(() => find('.interceptor-title h2'), 'second Foundation case responds');
  click('.interceptor-close-btn');
  await waitForModalClose('local receiver closed');
});

await run('Six viewport sizes, fixed investigation controls, and dialog fit', async () => {
  const state = filedFixture();
  await unload();
  state.latestSignalId = 'guixu';
  state.completedInvestigationActions.guixu = [];
  localStorage.setItem(storageKey, JSON.stringify(state));
  await open();
  for (const [width, height] of viewports) {
    frame.width = width;
    frame.height = height;
    await waitFor(() => frame.contentWindow.innerWidth === width && frame.contentWindow.innerHeight === height, `viewport ${width}×${height}`);
    const root = frame.contentDocument.documentElement;
    const dock = find('.strip-next-action').getBoundingClientRect();
    check(root.scrollWidth <= width, `Console overflows at ${width}×${height}`);
    if (width <= 960) {
      for (const control of frame.contentDocument.querySelectorAll('.observer-topbar button, .city-telemetry summary')) {
        const box = control.getBoundingClientRect();
        check(box.width >= 44 && box.height >= 44 && box.left >= 0 && box.right <= width,
          `${control.getAttribute('aria-label') ?? control.tagName} is ${box.width}×${box.height} at ${width}×${height}`);
      }
    }
    check(dock.left >= 0 && dock.right <= width && dock.top >= 0 && dock.bottom <= height, `Next action is outside the viewport at ${width}×${height}`);
    click('#signal-toolbar-trigger');
    await waitFor(() => find('.interceptor-panel'), 'interceptor opens');
    const panel = find('.interceptor-panel').getBoundingClientRect();
    check(panel.left >= 0 && panel.right <= width && panel.top >= 0 && panel.bottom <= height, `Interceptor does not fit at ${width}×${height}`);
    click('.interceptor-close-btn');
    await waitFor(() => !find('dialog'), 'interceptor closes');
  }
});

await run('Map stations, notebook edges, and narrow-screen reading controls', async () => {
  await unload();
  localStorage.setItem(storageKey, JSON.stringify(filedFixture()));
  await open();
  const doc = frame.contentDocument;
  const box = selector => find(selector).getBoundingClientRect();
  for (const [width, height] of [[1324,780], [1024,768], [980,400], [820,1180], [844,390], [700,375], [568,320], [390,844], [320,568]]) {
    frame.width = width;
    frame.height = height;
    await waitFor(() => frame.contentWindow.innerWidth === width && frame.contentWindow.innerHeight === height, 'layout viewport');
    frame.contentWindow.scrollTo(0, 0);
    const info = width + '×' + height;
    const root = doc.scrollingElement;
    check(root.scrollWidth <= root.clientWidth, 'Document pans sideways at ' + info);
    const field = box('.scene-frame'), tools = box('.window-toolbar');
    check(tools.top >= field.top && tools.bottom < field.bottom, 'Toolbar clipped by field at ' + info);
    if (width > 960) {
      const rail = box('.district-rail'), tabs = box('.panel-tabs'), pane = box('.panel-body'), scene = box('.city-window');
      check(Math.abs(rail.bottom - tabs.bottom) <= 1 && Math.abs(pane.top - scene.top) <= 1
        && Math.abs(pane.bottom - scene.bottom) <= 1, 'Notebook and field edges differ at ' + info);
    }
    click('.scene-waypoint');
    await waitFor(() => find('.scene-waypoint[aria-pressed="true"]'), 'nearby scene');
    check(box('.scene-waypoint').right <= box('.window-toolbar').left, 'Return control overlaps scene tools at ' + info);
    click('.map-toggle');
    await waitFor(() => find('.map-stations'), 'map displayed');
    const bounds = box('.scene-frame');
    for (const station of doc.querySelectorAll('.map-stations button')) {
      const r = station.getBoundingClientRect();
      check(r.width >= 44 && r.height >= 44 && r.top >= bounds.top && r.bottom <= bounds.bottom
        && r.left >= bounds.left && r.right <= bounds.right, 'Map station clipped at ' + info);
      station.scrollIntoView({ block: 'nearest' });
      const target = station.getBoundingClientRect();
      const hit = doc.elementFromPoint(target.x + target.width / 2, target.y + target.height / 2);
      check(station.contains(hit), 'Map station covered at ' + info);
      hit.click();
      await waitFor(() => station.getAttribute('aria-pressed') === 'true', 'station selected by its visible control');
    }
    click('.map-toggle');
    await waitFor(() => find('.scene-waypoint[aria-pressed="false"]'), 'return to exterior');
  }
  click('#inspector-tab-archive');
  await waitFor(() => find('.discovery-stack'), 'archive displayed');
  find('.discovery-card:last-child').scrollIntoView({ block: 'start' });
  const switcher = box('.panel-tabs');
  check(switcher.top >= 0 && switcher.bottom < frame.height, 'Notebook tabs scroll away from a long archive');
  click('#inspector-tab-systems');
  await waitFor(() => find('.weather-matrix'), 'systems displayed');
  check(box('.weather-matrix').top >= box('.panel-tabs').bottom - 1, 'Switching pages skipped the first system reading');
  frame.width = 1366;
  frame.height = 768;
});

await run('Two open sessions merge discoveries, actions, and diary entries', async () => {
  await unload();
  localStorage.removeItem(storageKey);
  const second = document.createElement('iframe');
  second.title = 'Second observer session';
  second.width = '430';
  second.height = '650';
  document.body.append(second);

  try {
    await Promise.all([open(), open('/YunShenChu/', second)]);
    const other = (selector) => second.contentDocument.querySelector(selector);
    click('#signal-toolbar-trigger');
    other('#signal-toolbar-trigger').click();
    await waitFor(() => find('.freq-slider') && other('.freq-slider'), 'both interceptors open');
    enter('.freq-slider', '104.2');
    enter('.freq-slider', '156.4', second);
    await waitFor(() => saved()?.discoveredSignalIds.length === 2
      && find('.interceptor-title-copy small')?.textContent.includes('2/5')
      && other('.interceptor-title-copy small')?.textContent.includes('2/5'), 'discovery progress converges across sessions');
    click('.interceptor-close-btn');
    other('.interceptor-close-btn').click();
    await waitFor(() => !find('dialog') && !other('dialog'), 'both interceptors close');
    click('.strip-next-action');
    other('.strip-next-action').click();
    await waitFor(() => saved()?.completedInvestigationActions.guixu?.length === 1
      && saved()?.completedInvestigationActions['ghost-rail']?.length === 1, 'actions persist without overwriting each other');
    const diaryIds = saved().diary.map(({ id }) => id);
    check(new Set(diaryIds).size === diaryIds.length, 'Diary entry IDs must be unique across sessions');
    check(saved().diary.filter(({ message }) => message.startsWith('Signal locked')).length === 2, 'Both logs should survive');
  } finally {
    second.remove();
  }
});

await run('Legacy migration preserves field records, future-schema protection, and denied storage', async () => {
  await unload();
  localStorage.removeItem(storageKey);
  localStorage.setItem(legacyKey, JSON.stringify({ schemaVersion: 2, discoveredSignalIds: ['guixu', 'unknown'] }));
  await open();
  await waitFor(() => saved()?.schemaVersion === 5, 'v2 migration');
  check(saved().discoveredSignalIds.join() === 'guixu', 'Migration should preserve only recognized signals');
  await unload();
  localStorage.removeItem(storageKey);
  localStorage.setItem('yunshenchu.observer.v3', JSON.stringify({
    schemaVersion: 3, discoveredSignalIds: ['guixu'],
    completedInvestigationActions: { guixu: ['inspect-foundation', 'trace-guixu', 'review-camera'] },
  }));
  await open();
  await waitFor(() => saved()?.completedInvestigationActions.guixu?.length === 3, 'v3 field records retained');
  check(find('.strip-next-action')?.textContent.includes('提交调查结论'), 'Migrated records should be ready to review');
  const future = JSON.stringify({ schemaVersion: 99, futureField: 'preserved' });
  await unload();
  localStorage.setItem(storageKey, future);
  await open();
  check(localStorage.getItem(storageKey) === future, 'Future schema must be preserved');
  await open('/YunShenChu/no-storage');
  check(find('.launch-brief')?.textContent.includes('仅保存在此页'), 'Console should continue without storage');
});

await run('Continue follows the saved case, the remaining search, or the final worksheet', async () => {
  const resume = async (state, label, rememberedSource) => {
    await unload();
    localStorage.setItem(storageKey, JSON.stringify(state));
    const start = await loadTitle();
    check(start.textContent.includes(label), 'Resume card should name ' + label);
    if (rememberedSource) check(find('.title-premise').textContent.includes(rememberedSource), 'Title recalls the last collected source');
    start.click();
  };
  const observer = filedFixture();
  observer.completedInvestigationActions['observer-return'] = ['trace-observer'];
  await resume(observer, '观察台 · 观察者回声 · 核对记忆记录', '隔离接收器');
  await waitFor(() => find('#case-desk-title')?.textContent === '观察者回声', 'observer worksheet after cold start');
  check(find('.case-next-record button').textContent.includes('核对记忆记录'), 'Worksheet offers the saved action');
  check(saved().completedInvestigationActions['observer-return'].length === 1, 'Resuming leaves the record to be collected');
  click('.case-close');
  await waitFor(() => frame.contentDocument.activeElement === find('.strip-next-action'), 'closing the resumed case returns to its next action');

  const market = filedFixture();
  market.latestSignalId = 'guixu';
  market.completedInvestigationActions['core-heartbeat'] = ['inspect-mid-ring'];
  await resume(market, '中环 · 核心心跳 · 调取终端读数');
  await waitFor(() => find('.city-window[data-district="mid_ring"]') && find('.site-primary')?.textContent.includes('调取终端读数'), 'next open investigation in another district');

  const nextStation = filedFixture();
  nextStation.latestSignalId = 'guixu';
  nextStation.discoveredSignalIds = nextStation.discoveredSignalIds.filter(id => id !== 'ghost-rail');
  delete nextStation.completedInvestigationActions['ghost-rail'];
  await resume(nextStation, '凌霄枢纽 · 监听道岔信号');
  await waitFor(() => find('.city-window[data-district="apex"]') && find('.site-primary')?.textContent.includes('监听道岔信号'), 'field lead in the remaining district');
  check(saved().discoveredSignalIds.length === 4, 'Arriving at a lead keeps the signal undiscovered');

  const lastBand = filedFixture();
  lastBand.latestSignalId = 'guixu';
  lastBand.discoveredSignalIds = lastBand.discoveredSignalIds.filter(id => id !== 'observer-return');
  delete lastBand.completedInvestigationActions['observer-return'];
  await resume(lastBand, '观察台 · 监听未记录的频道');
  await waitFor(() => find('.scan-btn'), 'remaining global band can be tuned');
  check(saved().discoveredSignalIds.length === 4, 'Opening the receiver leaves the search to the player');
  click('.interceptor-close-btn');
  await waitFor(() => frame.contentDocument.activeElement === find('.strip-scan-action'), 'closing the resumed scan returns to the receiver shortcut');

  await resume(filedFixture(), '零号月台 · 复原发车清单');
  await waitFor(() => find('#departure-title')?.textContent === 'Q-17 发车单', 'final worksheet opens from the title');
  check(saved().departureDecision === null, 'The player still chooses the ending');
  click('.case-close');
  await waitFor(() => frame.contentDocument.activeElement === find('.strip-dispatch'), 'closing the resumed manifest returns to the dispatch shortcut');
});

await run('A damaged primary save recovers its full ending from the same slot', async () => {
  await unload();
  const previous = { ...filedFixture(), departureDecision: { choice: 'hold', recordedAt: 1234 } };
  localStorage.setItem(storageKey, JSON.stringify(previous));
  await loadTitle();
  await waitFor(() => JSON.parse(localStorage.getItem(storageKey + '.recovery'))?.departureDecision?.choice === 'hold', 'recovery copy saved');
  await unload();
  localStorage.setItem(storageKey, '{interrupted');
  await loadTitle();
  await waitFor(() => find('.title-play').textContent.includes('重返云城'), 'recovered ending visible');
  await waitFor(() => localStorage.getItem(storageKey + '.damaged') === '{interrupted', 'damaged bytes preserved');
  check(saved().departureDecision.recordedAt === 1234, 'The recovered ending keeps its original receipt');
});

await run('Filed findings unlock a resident waybill, with both routes available before departure', async () => {
  await unload();
  localStorage.setItem(storageKey, JSON.stringify(filedFixture()));
  await loadTitle();
  click('.title-watch');
  await waitFor(() => find('nav[aria-label="选择居民来信"]'), 'postgame letter box');
  click('[data-stop="1"]');
  await waitFor(() => find('.watch-brief h2').textContent.includes('茶壶'), 'market letter');
  click('.watch-primary');
  await waitFor(() => saved()?.nightWatch?.parcel?.permit === 'local', 'waybill stored before final choice');
  for (const site of [0, 1, 2]) {
    click('[data-stop="' + site + '"]');
    await waitFor(() => find('[data-stop="' + site + '"]').getAttribute('aria-pressed') === 'true', 'at station');
    click('.watch-primary');
    await waitFor(() => find('[data-stop="' + site + '"]').textContent.includes('已取样'), 'loading slip');
  }
  const weight = Number(find('.watch-guide p').textContent.match(/重 (\d+) 公斤/)[1]);
  const slips = [...frame.contentDocument.querySelectorAll('.watch-readings dd')];
  check(slips.filter(s => parseInt(s.textContent) >= weight).length === 2, 'Two carriers can handle the cargo');
  const bay = slips.findIndex(s => s.textContent.includes('邮差接力'));
  click('.watch-orders input[value="' + bay + '"]');
  await waitFor(() => !find('.watch-submit').disabled, 'relay bay selected');
  click('.watch-submit');
  await waitFor(() => saved()?.nightWatch?.parcel?.via === bay, 'handover stored');
  await loadTitle();
  check(find('.title-watch').textContent.includes('核验封缄'), 'Return invitation remembers chosen carrier');
});

await run('No uncaught browser errors during the flows', () => check(browserErrors.length === 0, browserErrors.join(', ')));
const passed = failures.length === 0;
if (passed) frame.remove();
const summary = passed ? 'Browser checks passed.' : `Browser checks failed: ${failures.join(' | ')}`;
report.textContent += `\n\n${summary}`;
await publish(summary, passed);
