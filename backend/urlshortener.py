import random 
import string  

#for now lets have it so it just automatically determines the length as 6
def generate_hash(length): 
    chars = string.ascii_letters + string.digits 
    #this choses 6 random things from ascii letters and digits
    hash = "".join(random.choice(chars) for _ in range(6))
    return hash
