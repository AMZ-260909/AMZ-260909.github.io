-- Run once in your Supabase project's SQL Editor.
begin;

create table if not exists public.chapter_likes (
  chapter_number integer not null check (chapter_number between 1 and 343),
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (chapter_number, visitor_id)
);

alter table public.chapter_likes enable row level security;
revoke all on table public.chapter_likes from public, anon, authenticated;

create or replace function public.get_chapter_likes(chapter_number integer, visitor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if chapter_number is null or chapter_number not between 1 and 343 or visitor_id is null then
    raise exception 'Invalid chapter or visitor';
  end if;
  return (
    select pg_catalog.jsonb_build_object(
      'count', count(*),
      'liked', coalesce(bool_or(l.visitor_id = get_chapter_likes.visitor_id), false)
    ) from public.chapter_likes l
    where l.chapter_number = get_chapter_likes.chapter_number
  );
end;
$$;

create or replace function public.like_chapter(chapter_number integer, visitor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if chapter_number is null or chapter_number not between 1 and 343 or visitor_id is null then
    raise exception 'Invalid chapter or visitor';
  end if;
  insert into public.chapter_likes (chapter_number, visitor_id)
  values (like_chapter.chapter_number, like_chapter.visitor_id)
  on conflict do nothing;
  return public.get_chapter_likes(chapter_number, visitor_id);
end;
$$;

revoke all on function public.get_chapter_likes(integer, uuid) from public, anon, authenticated;
revoke all on function public.like_chapter(integer, uuid) from public, anon, authenticated;
grant execute on function public.get_chapter_likes(integer, uuid) to anon;
grant execute on function public.like_chapter(integer, uuid) to anon;

commit;
