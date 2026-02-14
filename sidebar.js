(function() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    document.documentElement.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
    document.documentElement.classList.remove('dark');
  }

  let themeIcon;
  let sidebar, overlay, menuBtn, headerTitle, themeToggle;

  function updateThemeIcon() {
    if (themeIcon) {
      const isDark = document.body.classList.contains('dark');
      themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
  }

  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('opacity-0', 'invisible');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('opacity-0', 'invisible');
    document.body.style.overflow = 'auto';
  }

  window.toggleFullScreen = function() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const style = document.createElement('style');
  style.textContent = `
    #sidebar { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); background-color: var(--bg-card); border-right: 1px solid var(--border-color); }
    #overlay { transition: opacity 0.3s ease-in-out, visibility 0.3s; }
    .nav-link { color: var(--text-muted); transition: all 0.2s; }
    .nav-link:hover { background-color: var(--accent-soft); color: var(--accent-green); }
    .nav-link.active { background-color: var(--accent-green); color: white !important; }
    header { background-color: var(--bg-card) !important; border-bottom: 1px solid var(--border-color) !important; color: var(--text-main) !important; }
    main#page-root { padding-top: 5rem; }
    #header-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
  `;
  document.head.appendChild(style);

  const navHTML = `
    <header class="fixed top-0 left-0 right-0 h-16 z-40 flex items-center justify-between px-4 shadow-sm">
      <div class="flex items-center">
        <button id="menu-btn" class="p-2 mr-3 focus:outline-none rounded-full w-10 h-10 flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5">
          <i class="fas fa-bars text-xl accent-text"></i>
        </button>
        <h1 id="header-title" class="text-lg font-bold tracking-tight"></h1>
      </div>
      <button class="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-red-400" onclick="toggleFullScreen()"><i class="fas fa-arrows-alt w-4 h-4"></i></button>
      <button id="theme-toggle" class="w-10 h-10 flex items-center justify-center rounded-xl soft-accent-bg accent-text transition-transform active:scale-90">
        <i class="fas fa-moon" id="theme-icon"></i>
      </button>
    </header>

    <div id="overlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 opacity-0 invisible"></div>

    <aside id="sidebar" class="fixed top-0 left-0 h-full w-72 z-50 transform -translate-x-full shadow-2xl flex flex-col">
      <div class="p-6 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 accent-bg rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-200 dark:shadow-none">
            <i class="fas fa-chart-line"></i>
          </div>
          <div>
            <h2 class="font-bold text-sm">Malcom Finance</h2>
            <p class="text-[10px] text-muted uppercase font-bold tracking-widest">Premium Account</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto p-4 space-y-2">
        <a href="home.html" id="nav-home" class="nav-link flex items-center p-3 rounded-xl font-medium">
          <i class="fas fa-th-large w-8 text-center mr-2"></i> Dashboard
        </a>
        <a href="balances.html" id="nav-balances" class="nav-link flex items-center p-3 rounded-xl font-medium">
          <i class="fas fa-wallet w-8 text-center mr-2"></i> My Balances
        </a>
        <a href="transactions.html" id="nav-transactions" class="nav-link flex items-center p-3 rounded-xl font-medium">
          <i class="fas fa-exchange-alt w-8 text-center mr-2"></i> Transactions
        </a>
        <a href="daily-activities.html" id="nav-activities" class="nav-link flex items-center p-3 rounded-xl font-medium">
          <i class="fas fa-tasks w-8 text-center mr-2"></i> Daily Tasks
        </a>
        <a href="offers.html" id="nav-offers" class="nav-link flex items-center p-3 rounded-xl font-medium">
          <i class="fas fa-gift w-8 text-center mr-2"></i> Special Offers
        </a>
        <div class="my-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          <p class="px-4 text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Account</p>
          <a href="account-settings.html" id="nav-settings" class="nav-link flex items-center p-3 rounded-xl font-medium">
            <i class="fas fa-cog w-8 text-center mr-2"></i> Settings
          </a>
          <button onclick="firebase.auth().signOut()" class="nav-link w-full flex items-center p-3 rounded-xl font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
            <i class="fas fa-sign-out-alt w-8 text-center mr-2"></i> Logout
          </button>
        </div>
      </nav>

      <div class="p-4">
        <div class="soft-accent-bg p-4 rounded-2xl">
          <p class="text-[10px] font-bold accent-text uppercase mb-1">Support Available</p>
          <p class="text-xs text-muted leading-tight mb-3">Need help with your investment?</p>
          <a href="contact.html" class="accent-bg text-white text-[11px] font-bold py-2 px-4 rounded-lg block text-center">Contact Agent</a>
        </div>
      </div>
    </aside>
  `;

  const container = document.createElement('div');
  container.innerHTML = navHTML;
  document.body.prepend(container);

  sidebar = document.getElementById('sidebar');
  overlay = document.getElementById('overlay');
  menuBtn = document.getElementById('menu-btn');
  headerTitle = document.getElementById('header-title');
  themeToggle = document.getElementById('theme-toggle');
  themeIcon = document.getElementById('theme-icon');

  window.syncHeaderTitle = function() {
    headerTitle.textContent = document.title.split('·')[0].trim();
  };

  menuBtn.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);
  themeToggle.addEventListener('click', toggleTheme);

  const observer = new MutationObserver(window.syncHeaderTitle);
  observer.observe(document.querySelector('title'), { childList: true });

  window.syncHeaderTitle();
  updateThemeIcon();

  const path = window.location.pathname.split('/').pop() || 'home.html';
  const navMap = {
    'home.html': 'nav-home',
    'balances.html': 'nav-balances',
    'transactions.html': 'nav-transactions',
    'daily-activities.html': 'nav-activities',
    'offers.html': 'nav-offers',
    'account-settings.html': 'nav-settings'
  };

  const activeId = navMap[path];
  if (activeId) {
    const activeLink = document.getElementById(activeId);
    if (activeLink) activeLink.classList.add('active');
  }

  document.querySelectorAll('#sidebar a').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
})();