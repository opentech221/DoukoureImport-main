-- Migration: create global shipping settings table for admin panel
-- Date: 2026-08-12

create table if not exists public.system_settings (
  id bigint primary key,
  rate_air_express_xof bigint not null default 11000,
  rate_air_eco_xof bigint not null default 7500,
  rate_maritime_cbm_xof bigint not null default 145000,
  margin_percentage numeric not null default 15,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (
  id,
  rate_air_express_xof,
  rate_air_eco_xof,
  rate_maritime_cbm_xof,
  margin_percentage,
  updated_at
)
values (1, 11000, 7500, 145000, 15, now())
on conflict (id) do nothing;

alter table public.system_settings disable row level security;
grant select, insert, update on table public.system_settings to anon, authenticated;

comment on table public.system_settings is 'Global shipping rates and margin configuration for the admin panel';
comment on column public.system_settings.rate_air_express_xof is 'Express air freight rate in FCFA per kg';
comment on column public.system_settings.rate_air_eco_xof is 'Eco air freight rate in FCFA per kg';
comment on column public.system_settings.rate_maritime_cbm_xof is 'Maritime freight rate in FCFA per CBM';
comment on column public.system_settings.margin_percentage is 'Global commercial margin percentage';
