import sys
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_admin_user_id, get_current_user_id
from app.services.supabase import get_supabase
from app.models.schemas import InviteUserRequest, RegisterProfileRequest, ProfileResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/invite", status_code=status.HTTP_201_CREATED)
def invite_user(
    body: InviteUserRequest,
    _: str = Depends(get_current_admin_user_id),
) -> dict[str, str]:
    supabase = get_supabase()
    try:
        supabase.auth.admin.invite_user_by_email(
            body.email,
            options={
                "data": {
                    "full_name": body.full_name,
                    "role": body.role,
                }
            },
        )
    except Exception as exc:
        print(f"Erro ao convidar usuário {body.email}: {exc}", file=sys.stdout)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível enviar o convite. Verifique o e-mail informado.",
        )

    print(f"Convite enviado para {body.email} com role={body.role}", file=sys.stdout)
    return {"message": f"Convite enviado para {body.email}"}


@router.post("/register-profile", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def register_profile(
    body: RegisterProfileRequest,
    user_id: str = Depends(get_current_user_id),
) -> ProfileResponse:
    supabase = get_supabase()

    existing = (
        supabase.table("profiles")
        .select("id")
        .eq("id", user_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Perfil já cadastrado para este usuário.",
        )

    try:
        result = (
            supabase.table("profiles")
            .insert(
                {
                    "id": user_id,
                    "full_name": body.full_name,
                    "email": body.email,
                    "role": body.role,
                }
            )
            .execute()
        )
        profile_data = result.data[0]
    except Exception as exc:
        print(f"Erro ao criar perfil para {user_id}: {exc}", file=sys.stdout)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao criar perfil. Tente novamente.",
        )

    print(f"Perfil criado: user={user_id} role={body.role}", file=sys.stdout)
    return ProfileResponse(**profile_data)
