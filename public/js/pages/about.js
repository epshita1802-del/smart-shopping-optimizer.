export async function about(app) {
  app.innerHTML = `
  <div class="page-head"><div><h1>About the algorithm</h1><p>0/1 Knapsack solved with Dynamic Programming</p></div></div>
  <div class="grid cols-2">
    <div class="card"><h2>The problem</h2>
      <p>You have a budget and many products. Each product has a <b>price</b> (like weight) and a <b>priority score</b> (like value).
      Each product can be bought <b>once or not at all</b> (0/1). Choose the set with the highest total score without spending more than the budget.</p>
      <p class="muted">Trying every subset costs O(2<sup>n</sup>). DP reuses sub-answers and needs only O(n&times;B).</p></div>
    <div class="card"><h2>The idea</h2>
      <p><code class="inline">dp[i][w]</code> = best total score using only the first <i>i</i> products with budget <i>w</i>.</p>
      <p>For product <i>i</i> there are two choices: <b>skip</b> it, or <b>buy</b> it if it fits.</p></div>
  </div>
  <div class="card section"><h2>Recurrence</h2>
<pre>dp[i][w] = dp[i-1][w]                                        if price[i] &gt; w
dp[i][w] = max( dp[i-1][w],                                  (skip)
                value[i] + dp[i-1][w - price[i]] )           (buy)    otherwise</pre>
    <p>We read from the <b>previous row</b> (<code class="inline">i-1</code>), so a product can never be counted twice.</p></div>
  <div class="grid cols-2 section">
    <div class="card"><h2>Backtracking</h2>
      <p>Start at <code class="inline">dp[n][B]</code>. If <code class="inline">dp[i][w] &ne; dp[i-1][w]</code>, product <i>i</i> was bought: subtract its price from <i>w</i>.
      Otherwise it was skipped. Walk up to row 0 to list the chosen products.</p></div>
    <div class="card"><h2>Complexity</h2>
      <p><b>Time:</b> O(n &times; B)<br><b>Space:</b> O(n &times; B) (full table kept for backtracking and visualization)</p>
      <p class="muted">n = number of products, B = budget as an integer. This is pseudo-polynomial: it grows with the <i>value</i> of B, not its number of digits.</p></div>
  </div>
  <div class="card section"><h2>Why not greedy?</h2>
    <p>Picking the best score-per-rupee first can waste money. Example: budget 100, items (price 60, score 60), (50, 50), (50, 50).
    Greedy takes the first item (score 60) and cannot afford another; DP buys the two cheaper ones for a score of 100.
    This app uses greedy-style strategies only as <b>labelled baselines</b> in the comparison table.</p></div>
  <div class="callout note section"><b>Integer money:</b> prices and budgets are whole rupees, because the DP table is indexed by budget. Integers also avoid floating-point rounding errors.</div>`;
}
