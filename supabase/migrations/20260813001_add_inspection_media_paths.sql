-- Migration: add private Storage paths for inspection media
-- Date: 2026-08-13

alter table public.orders
  add column if not exists inspection_photo_path text,
  add column if not exists inspection_video_path text,
  add column if not exists inspection_thumbnail_path text;

comment on column public.orders.inspection_photo_path is 'Relative path in the private inspection-media Storage bucket';
comment on column public.orders.inspection_video_path is 'Relative path in the private inspection-media Storage bucket';
comment on column public.orders.inspection_thumbnail_path is 'Relative path in the private inspection-media Storage bucket';
