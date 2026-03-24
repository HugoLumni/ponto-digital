import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    supabase_url: str = os.environ["SUPABASE_URL"]
    supabase_service_role_key: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase_jwt_secret: str = os.environ["SUPABASE_JWT_SECRET"]
    frontend_url: str = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    port: int = int(os.environ.get("PORT", "8000"))


settings = Settings()
