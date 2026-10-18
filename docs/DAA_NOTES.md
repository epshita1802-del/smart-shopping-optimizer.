# DAA notes for the project report and viva

## Problem statement
Given n products with integer prices c[i] and priority scores v[i], and an integer budget B, choose a subset
(each product at most once) that maximizes the total score without total price exceeding B. This is the 0/1 Knapsack problem.

## Why dynamic programming?
- **Optimal substructure:** the best answer for the first i products and budget w is built from the best answers for the first i-1 products.
- **Overlapping subproblems:** brute force (2^n subsets) recomputes the same sub-choices again and again. The table stores each answer once.

## Recurrence and base cases
dp[0][w] = 0 and dp[i][0] = 0 (no products or no money means no value).
dp[i][w] = dp[i-1][w] if c[i] > w, otherwise max(dp[i-1][w], v[i] + dp[i-1][w-c[i]]).

## Why one product cannot be picked twice
The include branch uses row i-1, never row i. If it used row i (the same row), a product could be reused: that is the *unbounded* knapsack.

## Reconstruction
Start at (n, B). If dp[i][w] != dp[i-1][w], product i was included: record it and set w = w - c[i]. Move to i-1. Takes O(n).

## Complexity
Time O(nB): two nested loops, constant work per cell. Space O(nB): full table (needed for backtracking and for the visualizer; O(B) is possible if you only need the value).
Pseudo-polynomial: it depends on the numeric value of B, so it is not truly polynomial in the input size (knapsack is NP-hard).

## Dynamic programming vs greedy
Greedy by value-per-rupee is fast (O(n log n)) but not always optimal for 0/1 items. Counter-example: budget 100, items (60,60), (50,50), (50,50).
Greedy picks the first item (score 60); DP picks the two others (score 100). The app shows greedy-style results only as labelled baselines.

## Likely viva questions
1. What are weight, value and capacity in your project? (price, priority score, budget)
2. Why integers? (table is indexed by budget; avoids floating-point errors)
3. What happens with budget 0 or an empty list? (table of zeros, nothing selected)
4. Can the table be reduced to one row? (yes, iterate w downwards, but backtracking then needs extra bookkeeping)
5. Is this polynomial? (pseudo-polynomial)
6. How do you know your result is optimal? (tests compare with brute force on 300 random cases)
