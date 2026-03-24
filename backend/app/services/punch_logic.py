from datetime import date
from typing import Literal
from app.services.supabase import get_supabase


def determine_punch_type(user_id: str) -> Literal["entrada", "saida"]:
    """
    Determina se o próximo registro deve ser 'entrada' ou 'saida'
    com base nos registros do dia atual do usuário.
    Permite múltiplos ciclos por dia (ex: saída para almoço e retorno).
    """
    today = date.today().isoformat()
    supabase = get_supabase()

    result = (
        supabase.table("punch_records")
        .select("type, punched_at")
        .eq("user_id", user_id)
        .eq("date", today)
        .order("punched_at", desc=True)
        .limit(1)
        .execute()
    )

    records = result.data

    if not records:
        return "entrada"

    last_type = records[0]["type"]
    if last_type == "entrada":
        return "saida"

    return "entrada"
