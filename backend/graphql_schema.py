import strawberry
from typing import List, Optional
from datetime import datetime
from database_config import supabase_client

@strawberry.type
class Click:
    id: str
    created_at: str
    ip_address: Optional[str]
    country: Optional[str]
    city: Optional[str]
    device_type: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    referrer: Optional[str]

@strawberry.type
class LinkAnalytics:
    total_clicks: int
    unique_clicks: int
    clicks: List[Click]
    
    # Aggregated data as JSON strings (simplifies return type for now)
    device_breakdown: str 
    browser_breakdown: str
    country_breakdown: str

@strawberry.type
class Query:
    @strawberry.field
    def analytics(self, short_hash: str) -> Optional[LinkAnalytics]:
        # 1. Get Link ID
        link_res = supabase_client.table('links').select('id').eq('short_hash', short_hash).execute()
        if not link_res.data:
            return None
        
        link_id = link_res.data[0]['id']

        # 2. Get Clicks
        clicks_res = supabase_client.table('clicks').select('*').eq('link_id', link_id).execute()
        clicks_data = clicks_res.data

        # 3. Process
        total = len(clicks_data)
        unique = len(set(c['ip_address'] for c in clicks_data if c.get('ip_address')))
        
        devices = {}
        browsers = {}
        countries = {}
        
        formatted_clicks = []

        for c in clicks_data:
            # Build Click Object
            formatted_clicks.append(Click(
                id=str(c['id']),
                created_at=str(c['created_at']),
                ip_address=c.get('ip_address'),
                country=c.get('country'),
                city=c.get('city'),
                device_type=c.get('device_type'),
                browser=c.get('browser'),
                os=c.get('os'),
                referrer=c.get('referrer')
            ))

            # Aggregations
            d = c.get('device_type') or 'Unknown'
            b = c.get('browser') or 'Unknown'
            co = c.get('country') or 'Unknown'
            
            devices[d] = devices.get(d, 0) + 1
            browsers[b] = browsers.get(b, 0) + 1
            countries[co] = countries.get(co, 0) + 1

        import json
        return LinkAnalytics(
            total_clicks=total,
            unique_clicks=unique,
            clicks=formatted_clicks,
            device_breakdown=json.dumps(devices),
            browser_breakdown=json.dumps(browsers),
            country_breakdown=json.dumps(countries)
        )

schema = strawberry.Schema(query=Query)

