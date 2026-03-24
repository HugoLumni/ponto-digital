from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt.exceptions import InvalidTokenError

from app.jwt_verify import decode_supabase_user_jwt
from app.services.supabase import get_supabase

bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    token = credentials.credentials
    try:
        payload = decode_supabase_user_jwt(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: sub ausente",
            )
        return user_id
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )


def get_current_admin_user_id(
    user_id: str = Depends(get_current_user_id),
) -> str:
    supabase = get_supabase()
    result = (
        supabase.table("profiles")
        .select("role")
        .eq("id", user_id)
        .single()
        .execute()
    )
    profile = result.data
    if not profile or profile.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores",
        )
    return user_id
