def generate_parentheses(n: int) -> list[str]:
    solutions = []
    
    def helper(open_count, close_count, current_string):
        if len(current_string) == 2 * n:
            solutions.append(current_string)
            return
        
        if open_count < n:
            helper(open_count + 1, close_count, current_string + "(")
        
        if close_count < open_count: 
            helper(open_count, close_count + 1, current_string + ")")
            
    helper(0, 0, "")
    return solutions

# tests
print(generate_parentheses(0))
# [""]

print(generate_parentheses(1))
# ["()"]

print(generate_parentheses(2))
# ["(())", "()()"]

print(generate_parentheses(3))
# ["((()))", "(()())", "(())()", "()(())", "()()()"]