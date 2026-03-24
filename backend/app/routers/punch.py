import sys
from datetime import datetime, timezone, date
from uuid import uuid4
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.dependencies import get_current_user_id
from app.services.supabase import get_supabase
from app.services.punch_logic import determine_punch_type
from app.models.schemas import PunchRegisterResponse
from app.config import settings

router = APIRouter(prefix="/punch", tags=["punch"])


def _resolve_extension(content_type: str | None) -> str:
    if content_type == "image/png":
        return "png"
    if content_type == "image/webp":
        return "webp"
    return "jpg"


@router.post("/register", response_model=PunchRegisterResponse)
async def register_punch(
    photo: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> PunchRegisterResponse:
    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Formato de imagem inválido. Use JPEG, PNG ou WebP.",
        )

    supabase = get_supabase()
    punch_type = determine_punch_type(user_id)
    timestamp = datetime.now(timezone.utc)
    extension = _resolve_extension(photo.content_type)
    storage_path = f"{user_id}/{timestamp.strftime('%Y%m%dT%H%M%S')}-{uuid4().hex}.{extension}"

    photo_bytes = await photo.read()
    if not photo_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Arquivo de imagem vazio.",
        )

    try:
        supabase.storage.from_(settings.storage_bucket_punch_photos).upload(
            path=storage_path,
            file=photo_bytes,
            file_options={
                "content-type": photo.content_type or "application/octet-stream",
                "upsert": "false",
            },
        )
    except Exception as exc:
        print(f"Erro no upload da foto: {exc}", file=sys.stdout)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao fazer upload da foto. Tente novamente.",
        )

    try:
        supabase.table("punch_records").insert(
            {
                "user_id": user_id,
                "type": punch_type,
                # Mantemos o nome da coluna por compatibilidade,
                # mas persistimos o caminho interno do Storage.
                "photo_url": storage_path,
                "punched_at": timestamp.isoformat(),
                "date": date.today().isoformat(),
            }
        ).execute()
    except Exception as exc:
        print(f"Erro ao salvar registro de ponto: {exc}", file=sys.stdout)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao registrar o ponto. Tente novamente.",
        )

    print(
        f"Ponto registrado: user={user_id} type={punch_type} at={timestamp.isoformat()}",
        file=sys.stdout,
    )

    return PunchRegisterResponse(
        type=punch_type,
        punched_at=timestamp,
        photo_url=storage_path,
    )
