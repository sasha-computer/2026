# sum all positive numbers in an array using recursion with both head/tail recursion

def positive_sum_head(arr: list[int]) -> int:
    if not arr:
        return 0
        
    head = arr[0]
    tail_sum = positive_sum_head(arr[1:])
    
    if head > 0:
        return head + tail_sum
        
    return tail_sum
    
def positive_sum_tail(arr: list[int]) -> int:
    print(f"positive_sum({arr}) called")
    def solve(current_items, sum_so_far):
        print(f"solve({current_items}, {sum_so_far}) called")
        if not current_items:
            return sum_so_far
            
        head = current_items[0]
        tail = current_items[1:]
        
        if head > 0:
            return solve(tail, sum_so_far + head)
        else:
            return solve(tail, sum_so_far)
        
    return solve(arr, 0)

print(positive_sum_head([1,-2]))
print(positive_sum_tail([1,-2]))


