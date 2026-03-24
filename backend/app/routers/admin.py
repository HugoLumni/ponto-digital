import sys
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.dependencies import get_current_admin_user_id
from app.services.supabase import get_supabase
from app.models.schemas import ProfileResponse, PunchRecordWithUser
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


def _extract_storage_path(raw_photo_value: str) -> str:
    """
    Aceita:
    - caminho interno salvo no banco: "<user_id>/<arquivo>.jpg"
    - URL pública legada do Supabase Storage
    Retorna sempre o caminho interno do objeto.
    """
    if not raw_photo_value:
        return raw_photo_value

    if not raw_photo_value.startswith("http://") and not raw_photo_value.startswith("https://"):
        return raw_photo_value

    parsed = urlparse(raw_photo_value)
    segments = [segment for segment in parsed.path.split("/") if segment]

    # Formatos comuns:
    # /storage/v1/object/public/<bucket>/<path...>
    # /storage/v1/object/sign/<bucket>/<path...>
    # /storage/v1/object/authenticated/<bucket>/<path...>
    for marker in ("public", "sign", "authenticated"):
        try:
            idx = segments.index(marker)
        except ValueError:
            continue

        if len(segments) > idx + 2:
            bucket = segments[idx + 1]
            if bucket == settings.storage_bucket_punch_photos:
                return "/".join(segments[idx + 2 :])

    return raw_photo_value


def _to_signed_url(supabase, raw_photo_value: str) -> str:
    storage_path = _extract_storage_path(raw_photo_value)
    if not storage_path:
        return raw_photo_value

    try:
        signed = supabase.storage.from_(settings.storage_bucket_punch_photos).create_signed_url(
            storage_path,
            settings.storage_signed_url_expires_seconds,
        )
        if isinstance(signed, dict):
            signed_url = signed.get("signedURL") or signed.get("signedUrl")
            if isinstance(signed_url, str) and signed_url:
                return signed_url
    except Exception as exc:
        print(f"Falha ao gerar signed URL para {storage_path}: {exc}", file=sys.stdout)

    # Fallback: mantém valor original para não quebrar resposta.
    return raw_photo_value


@router.get("/users", response_model=list[ProfileResponse])
def list_users(
    _: str = Depends(get_current_admin_user_id),
) -> list[ProfileResponse]:
    supabase = get_supabase()
    try:
        result = (
            supabase.table("profiles")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return [ProfileResponse(**row) for row in result.data]
    except Exception as exc:
        print(f"Erro ao listar usuários: {exc}", file=sys.stdout)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao buscar usuários.",
        )


@router.get("/logs", response_model=list[PunchRecordWithUser])
def list_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: str = Depends(get_current_admin_user_id),
) -> list[PunchRecordWithUser]:
    supabase = get_supabase()
    offset = (page - 1) * page_size
    try:
        result = (
            supabase.table("punch_records")
            .select("*, user:profiles(*)")
            .order("punched_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = result.data or []
        for row in rows:
            if isinstance(row, dict) and isinstance(row.get("photo_url"), str):
                row["photo_url"] = _to_signed_url(supabase, row["photo_url"])
        return [PunchRecordWithUser(**row) for row in rows]
    except Exception as exc:
        print(f"Erro ao listar logs: {exc}", file=sys.stdout)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao buscar registros.",
        )


@router.get("/logs/{user_id}", response_model=list[PunchRecordWithUser])
def list_logs_by_user(
    user_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: str = Depends(get_current_admin_user_id),
) -> list[PunchRecordWithUser]:
    supabase = get_supabase()
    offset = (page - 1) * page_size
    try:
        result = (
            supabase.table("punch_records")
            .select("*, user:profiles(*)")
            .eq("user_id", user_id)
            .order("punched_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = result.data or []
        for row in rows:
            if isinstance(row, dict) and isinstance(row.get("photo_url"), str):
                row["photo_url"] = _to_signed_url(supabase, row["photo_url"])
        return [PunchRecordWithUser(**row) for row in rows]
    except Exception as exc:
        print(f"Erro ao listar logs do usuário {user_id}: {exc}", file=sys.stdout)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao buscar registros do usuário.",
        )
