def depth_weighted_sum(nested_list):
    def solve(current_items, depth):
        # base case: empty list
        if not current_items:
            return 0
        
        head = current_items[0]
        tail = current_items[1:]
        
        if isinstance(head, list):
            values = solve(head, depth + 1)
        else:
            values = head * depth
            
        return values + solve(tail, depth)
    return solve(nested_list, 1)
        
        
    
    
    
    
    
    
       
 


# base case: 
# recursive step
# accumulator

# test cases
# dealing with arbitrarily deep nested structures, which recursion excels at
# return the sum of each integer, multipled by its depth


nested = [1, [2, 3], 4]
print(depth_weighted_sum(nested))
# depth 1: 1, 4
# depth 2: 2, 3
# result = (1 * 1) + (2 * 2) + (3 * 2) + (4 * 1) = 15

nested = [[1, 1], 2, [1, 1]]
print(depth_weighted_sum(nested))
# depth 1: 2
# depth 2: 1, 1, 1, 1
# result = (2 * 1) + (1 * 2) + (1 * 2) + (1 * 2) + (1 * 2) = 10

nested = [1, [4, [6]]]
print(depth_weighted_sum(nested))
# depth 1: 1
# depth 2: 4
# depth 3: 6
# result = (1 * 1) + (4 * 2) + (6 * 3) = 27