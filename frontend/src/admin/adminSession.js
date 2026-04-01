const ADMIN_MODE_KEY = 'oneulFarmAdminMode';

function notifyStorageChange() {
  window.dispatchEvent(
    new CustomEvent('oneulFarm:storage-change', {
      detail: { key: ADMIN_MODE_KEY },
    })
  );
}

export function isAdminMode() {
  return window.sessionStorage.getItem(ADMIN_MODE_KEY) === 'true';
}

export function enterAdminMode() {
  window.sessionStorage.setItem(ADMIN_MODE_KEY, 'true');
  notifyStorageChange();
}

export function exitAdminMode() {
  window.sessionStorage.removeItem(ADMIN_MODE_KEY);
  notifyStorageChange();
}

export function openAdminPage(hash = '#/admin') {
  enterAdminMode();
  window.location.hash = hash;
}

export function leaveAdminPage(hash = '#/mypage') {
  exitAdminMode();
  window.location.hash = hash;
}
