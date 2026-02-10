from functools import lru_cache

def make_memoized_factorial():
    cache = {0: 1, 1: 1}
    def factorial(n):
        if n not in cache:
            cache[n] = n * factorial(n - 1)
        return cache[n]
    return factorial
    
factorial = make_memoized_factorial()

print(factorial(5))

# with in-built Python cache

@lru_cache(None)
def rapid_factorial(n):
    return n * rapid_factorial(n - 1) if n > 1 else 1
    
print(rapid_factorial(100))
    