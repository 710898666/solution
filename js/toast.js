/**
 * toast.js — Toast 通知组件
 */

function showToast(title, desc, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'warn') toast.style.borderLeftColor = 'var(--accent-orange)';
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-desc">${desc}</div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
