-- Migration: extend products for dynamic ProductPage fields
-- Date: 2026-08-12

do $$
begin
  if to_regclass('public.products') is null then
    raise notice 'relation "products" does not exist, skipping migration 20260812001';
    return;
  end if;

  alter table public.products
    add column if not exists subtitle text,
    add column if not exists share_url text,
    add column if not exists estimated_weight_kg numeric,
    add column if not exists length_cm numeric,
    add column if not exists width_cm numeric,
    add column if not exists height_cm numeric;

  comment on column public.products.subtitle is 'Optional marketing subtitle shown on product page';
  comment on column public.products.share_url is 'Optional canonical share URL for product page';
  comment on column public.products.estimated_weight_kg is 'Estimated shipping weight in kilograms';
  comment on column public.products.length_cm is 'Package length in centimeters';
  comment on column public.products.width_cm is 'Package width in centimeters';
  comment on column public.products.height_cm is 'Package height in centimeters';
end $$;
