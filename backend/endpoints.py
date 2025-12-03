import random
import string
import io
import base64
import qrcode
import requests
from fastapi import FastAPI, Request, HTTPException, Header, Depends
from pydantic import BaseModel
from fastapi.responses import RedirectResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from user_agents import parse
from typing import Optional
from database_config import supabase_client

# GraphQL Imports
import strawberry
from strawberry.fastapi import GraphQLRouter
from graphql_schema import schema

app = FastAPI()

origins = [
    "http://localhost:5173", # Your Vite React App (default)
    "http://127.0.0.1:5173",
    "http://localhost:5174", # Fallback ports
    "http://localhost:5175",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount GraphQL
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")

class UrlVal(BaseModel): 
    link: str
    user_id: Optional[str] = None

class QrRequest(BaseModel):
    link: str

def generate_hash(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def get_geo_data(ip_address):
    # Handle Localhost Development Case
    if ip_address in ["127.0.0.1", "::1", "localhost"]:
        # Use a dummy public IP (Google DNS) for testing to get a valid location result
        # This allows you to see "Mountain View, United States" instead of "Unknown" while developing
        ip_address = "8.8.8.8"

    try:
        # Using ipapi.co
        response = requests.get(f"https://ipapi.co/{ip_address}/json/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            # ipapi.co returns 'Reserved' for private IPs if not caught above
            if data.get("reserved"):
                return {"country": "Local Network", "city": "Local"}
                
            return {
                "country": data.get("country_name"),
                "city": data.get("city"),
            }
    except Exception as e:
        print(f"Geo lookup failed: {e}")
    return {"country": None, "city": None}

@app.get("/")
def read_root():
    return {"message": "QRLinx Backend is Running"}

@app.post("/shorten_url")
async def shorten_url(user_data: UrlVal, request: Request):
    url_link = user_data.link
    user_id = user_data.user_id
    
    # Basic validation
    if not url_link:
        raise HTTPException(status_code=400, detail="URL is required")

    # Generate unique hash
    hash_val = generate_hash()
    # Ensure uniqueness (simple check, in production handle DB constraint error)
    while True:
        existing = supabase_client.table('links').select('id').eq('short_hash', hash_val).execute()
        if not existing.data:
            break
        hash_val = generate_hash()

    # Prepare data
    new_link = {
        "original_url": url_link,
        "short_hash": hash_val,
        "user_id": user_id  # Can be None if guest
    }

    # Save to Supabase
    try:
        response = supabase_client.table('links').insert(new_link).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    base_url = str(request.base_url)
    # Strip trailing slash if present to avoid double slash
    base_url = base_url.rstrip('/')
    
    return {
        "short_url": f"{base_url}/{hash_val}",
        "short_hash": hash_val,
        "original_url": url_link
    }

@app.post("/create_qrcode") 
async def create_qrcode(data: QrRequest):
    link = data.link
    if not link:
        raise HTTPException(status_code=400, detail="Link is required")

    # Generate QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(link)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return {"qrcode_base64": img_str}

# Replaced by GraphQL, but keeping for reference if needed
@app.get("/analytics/{short_hash}")
async def get_analytics(short_hash: str):
    # Verify link exists
    link_res = supabase_client.table('links').select('id').eq('short_hash', short_hash).execute()
    if not link_res.data:
        raise HTTPException(status_code=404, detail="Link not found")
    
    link_id = link_res.data[0]['id']

    # Fetch clicks
    clicks_res = supabase_client.table('clicks').select('*').eq('link_id', link_id).execute()
    clicks = clicks_res.data

    total_clicks = len(clicks)
    unique_clicks = len(set(c['ip_address'] for c in clicks if c.get('ip_address')))
    
    # Aggregations
    devices = {}
    browsers = {}
    os_systems = {}
    countries = {}

    for c in clicks:
        dev = c.get('device_type') or 'Unknown'
        brows = c.get('browser') or 'Unknown'
        os_sys = c.get('os') or 'Unknown'
        country = c.get('country') or 'Unknown'

        devices[dev] = devices.get(dev, 0) + 1
        browsers[brows] = browsers.get(brows, 0) + 1
        os_systems[os_sys] = os_systems.get(os_sys, 0) + 1
        countries[country] = countries.get(country, 0) + 1

    return {
        "total_clicks": total_clicks,
        "unique_clicks": unique_clicks,
        "device_type": devices,
        "browser": browsers,
        "os": os_systems,
        "country": countries
    }

@app.get("/{short_hash}")
async def redirect_to_origin(short_hash: str, request: Request, user_agent: Optional[str] = Header(None)):
    # Lookup link
    response = supabase_client.table('links').select('*').eq('short_hash', short_hash).execute()
    
    if not response.data:
        # 404 Page or JSON
        return {"error": "URL not found", "status": 404}
    
    link_data = response.data[0]
    original_url = link_data['original_url']
    link_id = link_data['id']

    # Analytics Tracking (Async in production, blocking here for simplicity)
    ip_address = request.client.host
    
    # Parse User Agent
    ua_string = user_agent or ""
    user_agent_parsed = parse(ua_string)
    
    browser = user_agent_parsed.browser.family
    os_sys = user_agent_parsed.os.family
    
    device_type = "Desktop"
    if user_agent_parsed.is_mobile:
        device_type = "Mobile"
    elif user_agent_parsed.is_tablet:
        device_type = "Tablet"
    
    # Geo Lookup
    geo_data = get_geo_data(ip_address)
    
    click_data = {
        "link_id": link_id,
        "ip_address": ip_address,
        "user_agent": ua_string,
        "browser": browser,
        "os": os_sys,
        "device_type": device_type,
        "country": geo_data.get("country"),
        "city": geo_data.get("city"),
        "referrer": request.headers.get("referer")
    }

    try:
        supabase_client.table('clicks').insert(click_data).execute()
    except Exception as e:
        print(f"Analytics error: {e}")

    return RedirectResponse(url=original_url)
