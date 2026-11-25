-- ============================================
-- Kotton | إعداد قاعدة البيانات
-- الملف ده بيتشغل مرة واحدة في Supabase SQL Editor
-- (خطوة 3 في ملف خطوات-التشغيل.txt)
-- آمن يتشغل أكتر من مرة، مش بيضيع أي بيانات
-- ============================================

-- 1) جدول المنتجات
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric not null default 0,
  sizes jsonb not null default '["S","M","L","XL"]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  sold_out boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2) الصلاحيات: الكل يشوف، بس صاحب المتجر (المسجل دخوله) يعدل
alter table public.products enable row level security;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (true);

drop policy if exists products_auth_insert on public.products;
create policy products_auth_insert on public.products
  for insert to authenticated with check (true);

drop policy if exists products_auth_update on public.products;
create policy products_auth_update on public.products
  for update to authenticated using (true) with check (true);

drop policy if exists products_auth_delete on public.products;
create policy products_auth_delete on public.products
  for delete to authenticated using (true);

-- 3) مكان تخزين صور المنتجات
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists images_public_read on storage.objects;
create policy images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists images_auth_insert on storage.objects;
create policy images_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists images_auth_update on storage.objects;
create policy images_auth_update on storage.objects
  for update to authenticated using (true) with check (bucket_id = 'product-images');

drop policy if exists images_auth_delete on storage.objects;
create policy images_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');

-- 4) المنتجات الحالية بتتضاف لوحدها (لو الجدول فاضي بس)
do $$
begin
  if not exists (select 1 from public.products) then
    insert into public.products (name, description, price, sort_order, colors) values
  ('سويت شيرت أوفر سايز',
   'سويت شيرت أوفر سايز مريح بتصميم بسيط. متاح في 11 لون.',
   650, 1,
   '[{"name": "أزرق فاتح", "swatch": "#aed6f1", "image": "photos/s1.jpg"}, {"name": "أحمر", "swatch": "#b03a2e", "image": "photos/s2.jpg"}, {"name": "أبيض", "swatch": "#f2f3f4", "image": "photos/s3.jpg"}, {"name": "أسود", "swatch": "#1b2631", "image": "photos/s4.jpg"}, {"name": "أخضر غامق", "swatch": "#1e5631", "image": "photos/s5.jpg"}, {"name": "كحلي", "swatch": "#1b2a4a", "image": "photos/s6.jpg"}, {"name": "تركواز", "swatch": "#117a8b", "image": "photos/s7.jpg"}, {"name": "رمادي غامق", "swatch": "#4d5656", "image": "photos/s8.jpg"}, {"name": "عنابي", "swatch": "#7b241c", "image": "photos/s9.jpg"}, {"name": "بيج", "swatch": "#e8dcc4", "image": "photos/s10.jpg"}, {"name": "رمادي فاتح", "swatch": "#d5dbdb", "image": "photos/s11.jpg"}]'::jsonb),
  ('تريكو موهير',
   'تريكو موهير ناعم ودافي. متاح في 5 ألوان.',
   849, 2,
   '[{"name": "أزرق فاتح متدرج", "swatch": "linear-gradient(135deg,#d6eaf8,#85c1e9)", "image": "photos/k1.jpg"}, {"name": "بينك متدرج", "swatch": "linear-gradient(135deg,#fadbd8,#ec7063)", "image": "photos/k2.jpg"}, {"name": "رمادي", "swatch": "#5d6d7e", "image": "photos/k3.jpg"}, {"name": "بني متدرج", "swatch": "linear-gradient(135deg,#a1887f,#4e342e)", "image": "photos/k4.jpg"}, {"name": "عنابي", "swatch": "#7b1e3b", "image": "photos/k5.jpg"}]'::jsonb);
  end if;
end $$;

-- خلصنا. المفروض تشوف رسالة Success تحت.
