# practice-problems

Handwritten coding problems I worked through while studying [Structure and Interpretation of Computer Programs (SICP)](https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/index.html), Section 1, alongside general recursion and functional programming practice.

The SICP stuff got me thinking in terms of closures, recursion, higher-order functions, and building up from primitives. These problems are the result of that mindset applied to Python and a bit of Scheme.

## Problems

| File | What it does |
|------|-------------|
| `currying.py` | Generic curry function that works with any arity, supports partial application in any grouping |
| `memoized_factorial_closure.py` | Factorial using a closure-based cache, plus a version with `@lru_cache` for comparison |
| `depth_weighted_sum.py` | Recursively sum integers in arbitrarily nested lists, weighted by their depth |
| `generate_parentheses.py` | Generate all valid combinations of n pairs of parentheses using backtracking |
| `recursive_join.py` | String join implemented recursively, no built-in join |
| `sum_types.py` | Pattern matching on sum types (enums) to build a CSV export state machine |
| `dir_reduc.py` | Reduce a list of directions by cancelling opposites |
| `dir_reduc_non_retarded.py` | Same problem, cleaner solution |
| `filter_list.py` | Filter a mixed list to only integers |
| `palindrome.py` | Palindrome checker |
| `phone_number.py` | Format digits into a phone number string |
| `recr_sum_postive_numbers.py` | Recursive sum of positive numbers |
| `words.py` | Word manipulation |
| `scheme/test.scm` | First steps in Scheme (SICP Chapter 1) |

## Running

```bash
python <filename>.py
```

Each file is self-contained with inline test cases.
