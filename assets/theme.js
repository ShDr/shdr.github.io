// Footer year and the light/dark toggle (dark is the default).
document.getElementById('y').textContent = new Date().getFullYear();
document.querySelector('.theme')?.addEventListener('click', function () {
  var root = document.documentElement;
  var next = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
});
