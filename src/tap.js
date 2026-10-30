// Maps a tapped object's role to box / pile actions.

export function findRole(object) {
  for (let o = object; o; o = o.parent) {
    if (o.userData && o.userData.role) return o.userData.role;
  }
  return null;
}

export function dispatchTap(role, { box, piles }) {
  if (!role) return null;
  if (role === 'lid' || role === 'base') {
    if (box.state === 'closed') return box.open();
    const pileBusy = Object.values(piles).some((p) => p.busy);
    if (role === 'lid' && box.state === 'open' && !pileBusy) return box.close();
    return null;
  }
  const match = /^(?:pile|fanCard):(\w+)$/.exec(role);
  if (match && box.state === 'open' && piles[match[1]]) return piles[match[1]].toggle();
  return null;
}
