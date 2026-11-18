-- Step 14: Pintasan iPhone — catat transaksi dari Shortcut "ketuk belakang iPhone"
-- Jalankan SEKALI di Supabase → SQL Editor → New query → tempel seluruh isi file ini → Run.
-- Aman dijalankan ulang (semua perintah memakai "if not exists" / "or replace").
--
-- Alurnya: Shortcut di iPhone memotret layar "Pembayaran berhasil", membaca teksnya, lalu
-- mengirimkannya ke https://financeme-three.vercel.app/api/shortcut bersama token pribadi.
-- Server membaca nominal/merchant/kategori/akun dengan AI, lalu memanggil fungsi di bawah.
-- Token hanya disimpan dalam bentuk hash SHA-256, jadi isi database tidak membocorkan token.

create extension if not exists pgcrypto with schema extensions;

-- ── Token pribadi (satu per pengguna) ─────────────────────────
create table if not exists public.shortcut_tokens (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.shortcut_tokens enable row level security;
drop policy if exists "users see own shortcut token" on public.shortcut_tokens;
create policy "users see own shortcut token" on public.shortcut_tokens
  for select using (auth.uid() = user_id);

-- ── Riwayat kiriman (mencegah layar yang sama tercatat dua kali) ──
create table if not exists public.shortcut_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  dedup_key      text not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_shortcut_events_user_key
  on public.shortcut_events (user_id, dedup_key, created_at desc);
alter table public.shortcut_events enable row level security;
drop policy if exists "users see own shortcut events" on public.shortcut_events;
create policy "users see own shortcut events" on public.shortcut_events
  for select using (auth.uid() = user_id);

-- ── Token → pemilik (internal, tidak bisa dipanggil dari luar) ──
create or replace function public._shortcut_user(p_token text)
returns uuid
language sql stable security definer
set search_path = public, extensions
as $$
  select user_id from public.shortcut_tokens
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- ── Buat token baru (token lama langsung tidak berlaku) ────────
-- Token asli hanya dikembalikan sekali; setelah itu hanya hash-nya yang tersimpan.
create or replace function public.create_shortcut_token()
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_user  uuid := auth.uid();
  v_token text;
begin
  if v_user is null then
    raise exception 'Harus masuk ke FinanceMe dulu';
  end if;
  v_token := 'fm_' || encode(gen_random_bytes(24), 'hex');
  insert into public.shortcut_tokens (user_id, token_hash)
  values (v_user, encode(digest(v_token, 'sha256'), 'hex'))
  on conflict (user_id) do update
    set token_hash = excluded.token_hash, created_at = now(), last_used_at = null;
  return v_token;
end;
$$;

-- ── Cabut token ───────────────────────────────────────────────
create or replace function public.revoke_shortcut_token()
returns void
language sql security definer
set search_path = public
as $$
  delete from public.shortcut_tokens where user_id = auth.uid();
$$;

-- ── Akun & kategori pemilik token (bahan untuk AI) ────────────
-- Mengembalikan null bila token tidak valid.
create or replace function public.shortcut_context(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := public._shortcut_user(p_token);
begin
  if v_user is null then
    return null;
  end if;
  return jsonb_build_object(
    'today', (now() at time zone 'Asia/Jakarta')::date,
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'type', a.type, 'icon', a.icon) order by a.created_at)
      from public.accounts a where a.user_id = v_user), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'type', c.type) order by c.type, c.name)
      from public.categories c where c.user_id = v_user), '[]'::jsonb)
  );
end;
$$;

-- ── Catat transaksi dari Shortcut ─────────────────────────────
-- Status: ok | duplicate | unauthorized | invalid | invalid_account
create or replace function public.shortcut_add_transaction(
  p_token       text,
  p_type        text,
  p_amount      numeric,
  p_description text,
  p_account_id  uuid,
  p_category_id uuid,
  p_date        date,
  p_dedup_key   text
)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_user     uuid := public._shortcut_user(p_token);
  v_today    date := (now() at time zone 'Asia/Jakarta')::date;
  v_date     date := p_date;
  v_key      text := nullif(left(trim(coalesce(p_dedup_key, '')), 200), '');
  v_category uuid := p_category_id;
  v_existing uuid;
  v_tx       uuid;
begin
  if v_user is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;
  if p_type is null or p_type not in ('income', 'expense')
     or p_amount is null or p_amount <= 0 or p_amount >= 1000000000000 then
    return jsonb_build_object('status', 'invalid');
  end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user) then
    return jsonb_build_object('status', 'invalid_account');
  end if;
  if v_category is not null
     and not exists (select 1 from public.categories where id = v_category and user_id = v_user) then
    v_category := null;
  end if;
  -- Tanggal dari layar hanya dipakai bila masuk akal (31 hari terakhir)
  if v_date is null or v_date > v_today or v_date < v_today - 31 then
    v_date := v_today;
  end if;

  -- Satu per satu per pengguna, supaya dua kiriman bersamaan tidak sama-sama lolos cek ganda
  perform pg_advisory_xact_lock(hashtext('shortcut:' || v_user::text));
  if v_key is not null then
    select e.transaction_id into v_existing
    from public.shortcut_events e
    join public.transactions t on t.id = e.transaction_id
    where e.user_id = v_user and e.dedup_key = v_key and e.created_at > now() - interval '3 days'
    order by e.created_at desc
    limit 1;
    if v_existing is not null then
      return jsonb_build_object('status', 'duplicate', 'transaction_id', v_existing);
    end if;
  end if;

  insert into public.transactions (user_id, account_id, category_id, type, amount, description, date)
  values (
    v_user, p_account_id, v_category, p_type, round(p_amount, 2),
    left(coalesce(nullif(trim(p_description), ''), 'Transaksi'), 120), v_date
  )
  returning id into v_tx;

  update public.accounts
  set balance = balance + case when p_type = 'income' then round(p_amount, 2) else -round(p_amount, 2) end
  where id = p_account_id;

  insert into public.shortcut_events (user_id, dedup_key, transaction_id)
  values (v_user, coalesce(v_key, v_tx::text), v_tx);
  update public.shortcut_tokens set last_used_at = now() where user_id = v_user;

  return jsonb_build_object('status', 'ok', 'transaction_id', v_tx, 'date', v_date);
end;
$$;

-- ── Hak akses ─────────────────────────────────────────────────
-- Fungsi bertoken bisa dipanggil server (kunci anon); pembuatan/pencabutan token
-- hanya oleh pengguna yang sedang masuk; fungsi internal tertutup untuk semua.
revoke all on function public._shortcut_user(text) from public, anon, authenticated;
revoke all on function public.create_shortcut_token() from public, anon;
revoke all on function public.revoke_shortcut_token() from public, anon;
revoke all on function public.shortcut_context(text) from public;
revoke all on function public.shortcut_add_transaction(text, text, numeric, text, uuid, uuid, date, text) from public;
grant execute on function public.create_shortcut_token() to authenticated;
grant execute on function public.revoke_shortcut_token() to authenticated;
grant execute on function public.shortcut_context(text) to anon, authenticated;
grant execute on function public.shortcut_add_transaction(text, text, numeric, text, uuid, uuid, date, text) to anon, authenticated;

-- ✅ Selesai. Kembali ke FinanceMe → Pengaturan → Pintasan iPhone → "Buat token".
