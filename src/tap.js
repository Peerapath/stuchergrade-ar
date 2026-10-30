// Maps a tapped object's role to box / pile actions.

export function findTagged(object) {
  for (let o = object; o; o = o.parent) {
    if (o.userData && o.userData.role) return o;
  }
  return null;
}

export function findRole(object) {
  return findTagged(object)?.userData.role ?? null;
}

export function dispatchTap(role, { box, piles, showCard }, face = null) {
  if (!role) return null;
  if (role === 'lid' || role === 'base') {
    if (box.state === 'closed') return box.open();
    const pileBusy = Object.values(piles).some((p) => p.busy);
    if (role === 'lid' && box.state === 'open' && !pileBusy) return box.close();
    return null;
  }
  const match = /^(pile|fanCard):(\w+)$/.exec(role);
  if (!match || box.state !== 'open' || !piles[match[2]]) return null;
  const pile = piles[match[2]];
  if (match[1] === 'pile') return pile.toggle();
  if (pile.state === 'fanned' && face) showCard(face);
  return null;
}
