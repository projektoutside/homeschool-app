export const DROP_MS = 860;
export const REST_TILT = Object.freeze({ x: -.29, y: .17 });

export function reconcileCoins(previous, selection, nextKey) {
  const pools = new Map();
  for (const coin of previous) {
    if (!pools.has(coin.id)) pools.set(coin.id, []);
    pools.get(coin.id).push(coin);
  }
  return selection.map(id => pools.get(id)?.shift() || { id, key: nextKey(), fresh: true });
}

export function dropPose(from, to, elapsed) {
  const t = Math.max(0, Math.min(1, elapsed / DROP_MS));
  const travel = Math.min(1, t / .76);
  const mix = travel * travel * (3 - 2 * travel);
  const lift = Math.min(110, Math.max(36, Math.abs(to.y - from.y) * .22));
  const impact = t > .76 ? Math.abs(Math.sin((t - .76) / .24 * Math.PI * 2)) * 5 * (1 - t) / .24 : 0;
  return {
    x: from.x + (to.x - from.x) * mix,
    y: from.y + (to.y - from.y) * mix - 4 * lift * travel * (1 - travel) - impact,
    radius: from.radius + (to.radius - from.radius) * mix,
    rx: REST_TILT.x + Math.sin(travel * Math.PI) * .5,
    ry: REST_TILT.y + (1 - travel) * Math.PI * 2,
    rz: to.rz + Math.sin(travel * Math.PI) * .55,
    done: t === 1,
  };
}
