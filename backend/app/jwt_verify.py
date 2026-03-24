"""
Valida JWTs emitidos pelo Supabase Auth.

Projetos novos usam assinatura ES256 com JWKS em:
  {SUPABASE_URL}/auth/v1/.well-known/jwks.json

Projetos legados podem usar HS256 com SUPABASE_JWT_SECRET.
"""
from functools import lru_cache

import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError

from app.config import settings


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    base = settings.supabase_url.rstrip("/")
    return PyJWKClient(f"{base}/auth/v1/.well-known/jwks.json")


def _expected_issuer() -> str:
    return f"{settings.supabase_url.rstrip('/')}/auth/v1"


def decode_supabase_user_jwt(token: str) -> dict:
    """
    Decodifica e valida o access_token do usuário (não o service role).
    Levanta jwt.exceptions.InvalidTokenError se inválido.
    """
    header = jwt.get_unverified_header(token)
    alg = header.get("alg") or "HS256"

    decode_kwargs: dict = {
        "algorithms": [alg],
        "audience": "authenticated",
        "issuer": _expected_issuer(),
    }

    if alg == "HS256":
        secret = settings.supabase_jwt_secret
        if not secret:
            raise InvalidTokenError("HS256 exige SUPABASE_JWT_SECRET configurado")
        return jwt.decode(token, secret, **decode_kwargs)

    if alg in ("ES256", "RS256"):
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        return jwt.decode(token, signing_key.key, **decode_kwargs)

    raise InvalidTokenError(f"Algoritmo JWT não suportado: {alg}")
