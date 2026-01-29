opposite = {
    "NORTH": "SOUTH",
    "SOUTH": "NORTH",
    "EAST": "WEST",
    "WEST": "EAST"
}

def dir_reduc(directions):
    new_directions = []
    for d in directions:
        if new_directions and new_directions[-1] == opposite[d]:
            new_directions.pop()
        else:
            new_directions.append(d)
    return new_directions
    
print(dir_reduc(["NORTH", "EAST", "WEST", "SOUTH"]))
# []
    
print(dir_reduc(["NORTH", "SOUTH", "SOUTH", "EAST", "WEST", "NORTH", "WEST"]))
# 'WEST'