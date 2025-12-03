from dotenv import load_dotenv
import os
from supabase import create_client, Client

load_dotenv()

db_apikey = os.getenv("DB_API_KEY")
db_url = os.getenv("DB_URL")

# Rename to avoid confusion with the class
supabase_client = create_client(db_url, db_apikey)
