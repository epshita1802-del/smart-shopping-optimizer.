const icon = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICONS = {
  box: icon('<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>'),
  target: icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  grid: icon('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  chart: icon('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/>'),
  clock: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  shield: icon('<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
};

const feature = (href, ic, title, text) => `
  <a class="card feature" href="${href}">
    <div class="icon">${ic}</div>
    <h3>${title}</h3>
    <p>${text}</p>
    <span class="more">Open &rarr;</span>
  </a>`;

export async function home(app) {
  app.innerHTML = `
  <section class="hero">
    <div class="eyebrow">Design and Analysis of Algorithms</div>
    <h1>Spend smarter. Get the most value out of your budget.</h1>
    <p>Give each product a priority score, set your budget, and the 0/1 Knapsack dynamic programming algorithm
    picks the combination with the highest total value that never goes over budget.</p>
    <div class="hero-actions">
      <a class="btn big" href="#/optimize">Optimize my shopping</a>
      <a class="btn big secondary" href="#/visualize">Watch the algorithm</a>
    </div>
    <div class="hero-stats">
      <div><b>0/1 Knapsack</b><span>Dynamic programming</span></div>
      <div><b>O(n &times; B)</b><span>Time and space</span></div>
      <div><b>Python + Flask</b><span>Algorithm and API</span></div>
      <div><b>SQLite</b><span>Products and history</span></div>
    </div>
  </section>

  <div class="section-title"><div><h2>How it works</h2><p>Three simple steps from wish list to best basket.</p></div></div>
  <div class="steps">
    <div class="card step"><h3>Add your products</h3><p class="muted">Enter a name, category, price and a priority score from 1 to 10. Sample products are already included.</p></div>
    <div class="card step"><h3>Set a budget</h3><p class="muted">Type how much you can spend. Invalid amounts such as negatives or decimals are rejected.</p></div>
    <div class="card step"><h3>Get the best combination</h3><p class="muted">The DP table is filled, then backtracked to list exactly which products to buy and why.</p></div>
  </div>

  <div class="section-title section"><div><h2>Everything in one place</h2><p>Explore each part of the project.</p></div></div>
  <div class="features">
    ${feature("#/catalog", ICONS.box, "Product catalog", "Add, edit, delete, search and filter products by name, category and price.")}
    ${feature("#/optimize", ICONS.target, "Budget optimizer", "Pick the highest-value basket and see why it beats simpler strategies.")}
    ${feature("#/visualize", ICONS.grid, "DP visualizer", "Step through every table cell, include or exclude decision and the backtracking path.")}
    ${feature("#/dashboard", ICONS.chart, "Analytics dashboard", "Budget utilization, category spending and strategy comparison from real data.")}
    ${feature("#/history", ICONS.clock, "Optimization history", "Every run is saved in the database so you can reopen or delete it later.")}
    ${feature("#/about", ICONS.shield, "About the algorithm", "Recurrence, complexity and why dynamic programming beats greedy for this problem.")}
  </div>

  <div class="section-title section"><div><h2>Built with</h2></div></div>
  <div class="tech"><span>HTML</span><span>CSS</span><span>JavaScript</span><span>Python</span><span>Flask</span><span>SQLite</span><span>Chart.js</span></div>`;
}
