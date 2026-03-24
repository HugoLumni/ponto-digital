import sys
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.dependencies import get_current_admin_user_id
from app.services.supabase import get_supabase
from app.models.schemas import ProfileResponse, PunchRecordWithUser

router = APIRouter(prefix="/admin", tags=["admin"])


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
        return [PunchRecordWithUser(**row) for row in result.data]
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
        return [PunchRecordWithUser(**row) for row in result.data]
    except Exception as exc:
        print(f"Erro ao listar logs do usuário {user_id}: {exc}", file=sys.stdout)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao buscar registros do usuário.",
        )
