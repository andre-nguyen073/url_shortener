import random
import string
from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


origins = [
    "http://localhost:5173", # Your Vite React App
    "http://127.0.0.1:5173",
]

#this allows the fastapi to talk to the frontend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

short_urls = {}

class UrlVal(BaseModel): 
    link: str

def generate_hash(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


@app.get("/")
def read_root():
    return {"message": "QRLinx Backend is Running"}

@app.post("/shorten_url")
async def shorten_url(user_data: UrlVal, request: Request):
    url_link = user_data.link
    hash_val = generate_hash()
    while hash_val in short_urls:
        hash_val = generate_hash()

    # Save to "database"
    short_urls[hash_val] = url_link
    
    # Return full short URL
    base_url = str(request.base_url)
    return {"short_url": f"{base_url}{hash_val}"}  

@app.post("/create_qrcode") 


@app.get("/{short_hash}")
async def redirect_to_origin(short_hash: str):
    if short_hash in short_urls:
        original_url = short_urls[short_hash]
        return RedirectResponse(url=original_url)
    return {"error": "URL not found", "status": 404} 

