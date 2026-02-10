from typing import Callable

def curry(func: Callable, num_args: int):
    def wrapper(*args):
        if len(args) >= num_args:
            return func(*args)
        def next_step(*new_args):
            return wrapper(*(args + new_args))
        return next_step
    return wrapper
    
# tests
def add3(a, b, c):
    return a + b + c
    
curried_add3 = curry(add3, 3)

# Test 1: All at once
print(f"Test 1: {curried_add3(1, 2, 3)}") # Expected: 6

# Test 2: One at a time
print(f"Test 2: {curried_add3(1)(2)(3)}") # Expected: 6

# Test 3: Mixed grouping
print(f"Test 3: {curried_add3(1, 2)(3)}") # Expected: 6