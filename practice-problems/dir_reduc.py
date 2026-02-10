from typing import Literal
import copy

Direction = Literal["NORTH", "SOUTH", "EAST", "WEST"]
Opposites = {
    "NORTH": "SOUTH",
    "SOUTH": "NORTH",
    "EAST": "WEST",
    "WEST": "EAST"
}

def dir_reduc(directions: list[Direction]) -> list[Direction]:
    return parse(directions)
    
def parse(input_list: list[Direction]) -> list[Direction]:
    output_list = copy.deepcopy(input_list)
    for i in range(0, len(output_list) - 1):
        current = output_list[i]
        next = output_list[i + 1]
        if current == '':
            continue
        elif Opposites[current] == next:
            output_list[i] = ''
            output_list[i + 1] = ''
    
    output_list = [item for item in output_list if item != '']
        
    if len(output_list) != len(input_list):
        return parse(output_list)
    else:
        return output_list
    
print(dir_reduc(["NORTH", "EAST", "WEST", "SOUTH"]))
# []
    
print(dir_reduc(["NORTH", "SOUTH", "SOUTH", "EAST", "WEST", "NORTH", "WEST"]))
# 'WEST'

    
    