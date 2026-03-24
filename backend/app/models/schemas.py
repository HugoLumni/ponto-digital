from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, EmailStr


class ProfileResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: Literal["admin", "funcionario"]
    is_active: bool
    created_at: datetime


class PunchRecordResponse(BaseModel):
    id: str
    user_id: str
    type: Literal["entrada", "saida"]
    photo_url: str
    punched_at: datetime
    date: date


class PunchRecordWithUser(PunchRecordResponse):
    user: ProfileResponse


class PunchRegisterResponse(BaseModel):
    type: Literal["entrada", "saida"]
    punched_at: datetime
    photo_url: str


class InviteUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: Literal["admin", "funcionario"]


class RegisterProfileRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: Literal["admin", "funcionario"]


class ErrorResponse(BaseModel):
    detail: str
