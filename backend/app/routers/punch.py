import sys
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.dependencies import get_current_user_id
from app.services.supabase import get_supabase
from app.services.punch_logic import determine_punch_type
from app.models.schemas import PunchRegisterResponse

router = APIRouter(prefix="/punch", tags=["punch"])


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
    storage_path = f"{user_id}/{int(timestamp.timestamp())}.jpg"

    photo_bytes = await photo.read()

    try:
        supabase.storage.from_("punch-photos").upload(
            path=storage_path,
            file=photo_bytes,
            file_options={"content-type": "image/jpeg"},
        )
    except Exception as exc:
        print(f"Erro no upload da foto: {exc}", file=sys.stdout)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao fazer upload da foto. Tente novamente.",
        )

    photo_url = supabase.storage.from_("punch-photos").get_public_url(storage_path)

    try:
        supabase.table("punch_records").insert(
            {
                "user_id": user_id,
                "type": punch_type,
                "photo_url": photo_url,
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
        photo_url=photo_url,
    )
