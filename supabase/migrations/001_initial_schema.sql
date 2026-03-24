-- Tabela de perfis de usuário (complementa auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'funcionario')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Tabela de registros de ponto
create table public.punch_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('entrada', 'saida')),
  photo_url text not null,
  punched_at timestamptz default now(),
  date date not null default current_date
);

-- RLS: usuário só vê os próprios pontos; admin vê tudo
alter table public.profiles enable row level security;
alter table public.punch_records enable row level security;

create policy "Perfil próprio" on public.profiles
  for select using (auth.uid() = id);

create policy "Admin vê todos os perfis" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Funcionário vê seus próprios pontos" on public.punch_records
  for select using (auth.uid() = user_id);

create policy "Funcionário insere seus próprios pontos" on public.punch_records
  for insert with check (auth.uid() = user_id);

create policy "Admin vê todos os pontos" on public.punch_records
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Índices para performance
create index idx_punch_records_user_date on public.punch_records (user_id, date);
create index idx_punch_records_punched_at on public.punch_records (punched_at desc);
