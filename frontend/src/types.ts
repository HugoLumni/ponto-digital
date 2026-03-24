export type Role = 'admin' | 'funcionario'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface PunchRecord {
  id: string
  user_id: string
  type: 'entrada' | 'saida'
  photo_url: string
  punched_at: string
  date: string
}

export interface PunchRecordWithUser extends PunchRecord {
  user: Profile
}

export interface PunchRegisterResponse {
  type: 'entrada' | 'saida'
  punched_at: string
  photo_url: string
}
