# def create_phone_number(n: list[int]) -> str: 
#     str_n = [str(num) for num in n]
#     return f"({''.join(str_n[0:3])}) {''.join(str_n[3:6])}-{''.join(str_n[6:])}"
    
def create_phone_number(n: list[int]) -> str:
    return "({}{}{}) {}{}{}-{}{}{}{}".format(*n)

print(create_phone_number([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1]))
