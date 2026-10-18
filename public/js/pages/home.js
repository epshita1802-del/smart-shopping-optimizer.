export async function home(app) {
  app.innerHTML = `
  <section class="hero">
    <h1>Smart Shopping Budget Optimizer</h1>
    <p>Give every product a priority score, set your budget, and let the <b>0/1 Knapsack dynamic programming algorithm</b>
    pick the combination with the highest total value that never goes over budget.</p>
    <a class="btn" href="#/optimize">Optimize my shopping</a>
    <a class="btn secondary" href="#/visualize">See the DP table</a>
  </section>
  <div class="grid cols-3">
    <div class="card"><h3>1. Add products</h3><p class="muted">Name, category, price and a priority score from 1 to 10. Sample products are included.</p><a href="#/catalog">Open products &rarr;</a></div>
    <div class="card"><h3>2. Enter a budget</h3><p class="muted">The Python backend runs the DP and stores every run in the history.</p><a href="#/optimize">Open optimizer &rarr;</a></div>
    <div class="card"><h3>3. Understand the algorithm</h3><p class="muted">Step through the DP table, include/exclude decisions and backtracking.</p><a href="#/visualize">Open visualizer &rarr;</a></div>
  </div>
  <div class="card section"><h2>Technology</h2>
    <p class="muted" style="margin:0">Frontend: HTML, CSS, JavaScript &middot; Backend: Python (Flask) &middot; Algorithm: Python 0/1 Knapsack (DP) &middot; Database: SQLite &middot; Charts: Chart.js</p></div>`;
}
