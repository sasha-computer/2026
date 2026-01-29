def filter_list(items: list) -> list:
    return [item for item in items if isinstance(item, int)]
    
print(filter_list([1,2,'a','b']))
# [1, 2]
    
    