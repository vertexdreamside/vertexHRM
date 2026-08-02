-- Toggling a like off (unlike) needs a DELETE policy on buzz_likes —
-- migration 0017 only ever added insert, since "like" was the only
-- direction considered at the time.

create policy "authenticated delete own buzz_likes" on buzz_likes
  for delete using (user_id = auth.uid());
