<template>
  <div class="shell">
    <nav>
      <span class="brand">hf</span>
      <div class="links">
        <RouterLink to="/">generate</RouterLink>
        <RouterLink to="/studio">studio</RouterLink>
        <RouterLink to="/history">history</RouterLink>
      </div>
    </nav>
    <div class="view">
      <RouterView />
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  height: 100%;
  overflow: hidden;
  background: #f4f1eb;
  color: #1c1a16;
  font-family: 'Courier Prime', 'Courier New', monospace;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 36px;
  border-bottom: 1px solid #ccc8bf;
  flex-shrink: 0;
}

.brand {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: #7a7670;
}

.links {
  display: flex;
  gap: 20px;
}

.links a {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: #7a7670;
  text-decoration: none;
  transition: color 0.1s;
}

.links a:hover { color: #1c1a16; }
.links a.router-link-active { color: #1c1a16; }

.view {
  flex: 1;
  overflow: hidden;
}
</style>
