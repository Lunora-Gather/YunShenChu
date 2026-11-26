// Solve from the guide and displayed receipts, independently of the dispatcher's seed and answer.
export function eligibleFreight(kind, guide, readings) {
  const minutes = value => {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  };
  return readings.flatMap((r, i) => {
    if (!r) return [];
    const weight = Number(guide.match(/重 (\d+) 公斤/)?.[1]);
    let ok;
    if (kind === 6) ok = Number.parseInt(r.value) >= weight;
    if (kind === 7) {
      const [arrived, deadline] = guide.match(/\d\d:\d\d/g).map(minutes);
      const delay = Number(guide.match(/(?:需|验签) (\d+) 分钟/)?.[1] ?? 0);
      const [leaves, returns] = r.value.split(' → ').map(minutes);
      ok = leaves >= arrived + delay && returns <= deadline;
    }
    if (kind === 8) ok = r.value.split(' · ').every(code => guide.includes('「' + code + '」'));
    if (kind === 9) {
      const [total, aboard] = r.value.match(/\d+/g).map(Number);
      ok = total - aboard >= weight && r.detail.includes('有盖');
    }
    return ok ? [i] : [];
  });
}
