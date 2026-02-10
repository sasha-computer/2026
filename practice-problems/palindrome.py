def is_palindrome(word: str) -> bool:
    w = word.lower()
    if len(w) <= 1:
        return True
    return w[0] == w[-1] and is_palindrome(w[1:-1])

print(is_palindrome("Hello")) 
print(is_palindrome("raceCar")) 