from fastapi import FastAPI, Request
from pydantic import BaseModel
from urlshortener import generate_hash
from fastapi.responses import RedirectResponse
#use postman for testing 
app = FastAPI()

short_urls = {}
class UrlVal(BaseModel): 
    link: str

@app.get("/")
def login_page():
    return {"avaliable urls": "World"}

@app.post("/shorten_url")
#fastapi will convert the payload into json -> json gets checked on BaseModel if it does not match 
#return 422 error 
async def shorten_url(user_data: UrlVal, request: Request):
    #this contains the value that the user put in
    url_link = user_data.link
    hash = generate_hash(url_link)

    #this really should check between the database for now we can use a random dictionary    
    while hash in short_urls:
        hash = generate_hash()

    short_urls[hash] = url_link
    base_url = str(request.base_url)
    return {"short_url": f"{base_url}{hash}"}  


@app.get("/{short_hash}")
async def redirect_to_origin(short_hash: str):
    #you have to get this from the database but 
    original_url = short_urls[short_hash]
    return RedirectResponse(url=original_url)