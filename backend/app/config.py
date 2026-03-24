import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    supabase_url: str = os.environ["SUPABASE_URL"]
    supabase_service_role_key: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    # Obrigatório só para JWTs HS256 (legado). Tokens ES256 usam JWKS automaticamente.
    supabase_jwt_secret: str = os.environ.get("SUPABASE_JWT_SECRET", "").strip()
    frontend_urls: list[str] = [
        origin.strip()
        for origin in os.environ.get("FRONTEND_URLS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    port: int = int(os.environ.get("PORT", "8000"))


settings = Settings()
