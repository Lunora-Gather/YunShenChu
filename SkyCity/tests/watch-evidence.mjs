export function evidenceAnswer(incident, skip) {
  if (incident.kind === 4) {
    const locations = ['候车长廊','檐下的茶摊','塔底检修口'];
    const candidatePairs = [[0,1],[1,2],[0,2]];
    return candidatePairs.findIndex(([a,b]) => incident.readings.every((r,i) =>
      i === skip || locations[i === a ? b : i === b ? a : i] === r.value));
  }
  if (incident.kind === 5) {
    return incident.tracks.findIndex(t => t.sounds.every((v,i) => i === skip || v === incident.readings[i].value));
  }
  const observations = incident.readings.flatMap((reading, i) => {
    if (i === skip) return [];
    const digits = reading.value.match(/\d+/g).map(Number);
    const bias = Number(reading.detail.match(/偏高 (\d+)/)?.[1] ?? 0);
    let value;
    if (incident.kind === 0) value = digits[2] - bias;
    if (incident.kind === 1) value = digits[1] - bias - digits[0];
    if (incident.kind === 2) value = (digits[2] - digits[0]) * 60 + digits[3] - digits[1] - bias;
    if (incident.kind === 3) value = digits[0] - (digits[1] - bias);
    return [{ site: i, value }];
  });
  if (incident.kind === 0 || incident.kind === 2) {
    const difference = observations[1].value - observations[0].value;
    return difference === 0 ? 2 : difference > 0 ? 0 : 1;
  }
  return observations.find(o => o.value > (incident.kind === 1 ? 6 : 0))?.site ?? skip;
}
