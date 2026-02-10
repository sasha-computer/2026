def recursive_join(strings: list[str], separator: str):
    if len(strings) <= 1:
        return strings[0] if strings else ""
    return strings[0] + separator + recursive_join(strings[1:], separator)
    
## test case
print(recursive_join(["apple", "banana", "cherry"], ", "))
# "apple, banana, cherry"

print(recursive_join(["hello"], " - ")) 
# "hello"

print(recursive_join([], " | "))
# ""