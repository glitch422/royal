/**
 * ==========================================
 * ROYAL - AVATAR RESOLVER (V1.0)
 * ==========================================
 * Rules:
 * - Guests have no profile.
 * - Players can choose between 8 avatars: player1..player8
 * - Staff avatars are fixed based on role: admin/root
 */

(function () {
  const MAP = {
    player1: 'assets/avatars/player1.jpeg',
    player2: 'assets/avatars/player2.jpeg',
    player3: 'assets/avatars/player3.jpeg',
    player4: 'assets/avatars/player4.jpeg',
    player5: 'assets/avatars/player5.jpeg',
    player6: 'assets/avatars/player6.jpeg',
    player7: 'assets/avatars/player7.jpeg',
    player8: 'assets/avatars/player8.jpeg',

    admin: 'assets/avatars/admin.png',
    root: 'assets/avatars/root.png',
};

  function avatarPathForUser(user) {
    if (!user) return '';
    const role = String(user.role || '').toLowerCase();
    if (role === 'guest') return '';

    const key = String(user.avatarKey || '').toLowerCase();
    if (MAP[key]) return MAP[key];

    if (role === 'player') return MAP.player1;
    if (MAP[role]) return MAP[role];
    return MAP.player1;
  }

  function avatarPickerOptions() {
    return ['player1','player2','player3','player4','player5','player6','player7','player8'].map(k => ({ key: k, src: MAP[k] }));
  }

  window.ROYAL_AVATARS = {
    avatarPathForUser,
    avatarPickerOptions,
    MAP,
  };
})();
