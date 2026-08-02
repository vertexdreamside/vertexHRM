"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2, Image as ImageIcon, PartyPopper, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";

interface AuthorInfo { username: string; employees: { full_name: string } | { full_name: string }[] | null }
interface CommentRow { id: string; author_id: string; text: string; created_at: string; app_users: AuthorInfo | AuthorInfo[] | null }
interface PostRow {
  id: string; author_id: string; text: string; created_at: string;
  app_users: AuthorInfo | AuthorInfo[] | null;
  buzz_likes: { user_id: string }[];
  buzz_comments: CommentRow[];
}

interface AnniversaryRow { id: string; full_name: string; date_joined: string }

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function displayName(author: AuthorInfo | null): string {
  if (!author) return "Someone";
  const employee = one(author.employees);
  return employee?.full_name ?? author.username;
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function BuzzPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [anniversaries, setAnniversaries] = useState<AnniversaryRow[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setMyUserId(user?.id ?? null);

    const [postsRes, employeesRes] = await Promise.all([
      supabase
        .from("buzz_posts")
        .select("id, author_id, text, created_at, app_users(username, employees(full_name)), buzz_likes(user_id), buzz_comments(id, author_id, text, created_at, app_users(username, employees(full_name)))")
        .order("created_at", { ascending: false }),
      // Upcoming Anniversaries — derived from employees.date_joined
      // (PIM), same month as today, per the note left in migration
      // 0017 rather than a separate seeded table.
      supabase.from("employees").select("id, full_name, date_joined").not("date_joined", "is", null)
    ]);

    setPosts((postsRes.data as unknown as PostRow[]) ?? []);

    const currentMonth = new Date().getMonth();
    const upcoming = ((employeesRes.data ?? []) as { id: string; full_name: string; date_joined: string }[])
      .filter((e) => new Date(e.date_joined).getMonth() === currentMonth)
      .sort((a, b) => new Date(a.date_joined).getDate() - new Date(b.date_joined).getDate());
    setAnniversaries(upcoming);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function publish() {
    if (!draft.trim() || !myUserId) return;
    setPosting(true);
    await supabase.from("buzz_posts").insert({ author_id: myUserId, text: draft.trim() });
    setPosting(false);
    setDraft("");
    load();
  }

  async function toggleLike(post: PostRow) {
    if (!myUserId) return;
    const alreadyLiked = post.buzz_likes.some((l) => l.user_id === myUserId);
    if (alreadyLiked) {
      await supabase.from("buzz_likes").delete().eq("post_id", post.id).eq("user_id", myUserId);
    } else {
      await supabase.from("buzz_likes").insert({ post_id: post.id, user_id: myUserId });
    }
    load();
  }

  async function addComment(postId: string) {
    const text = commentDraft[postId]?.trim();
    if (!text || !myUserId) return;
    await supabase.from("buzz_comments").insert({ post_id: postId, author_id: myUserId, text });
    setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
    load();
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading feed…</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="font-display text-2xl font-medium text-ink">Buzz</h1>
        <p className="mt-1 text-sm text-ink-muted">The company newsfeed — live from Supabase.</p>

        <div className="mt-6 rounded-card border border-surface-border bg-white p-4">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What's on your mind?" rows={3} className="w-full resize-none rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
          <div className="mt-2 flex items-center justify-between">
            <button type="button" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink" title="Image attachments not wired to storage yet">
              <ImageIcon size={16} /> Photo
            </button>
            <button onClick={publish} disabled={posting || !draft.trim()} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
              {posting && <Loader2 size={14} className="animate-spin" />} Post
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {posts.map((post) => {
            const author = one(post.app_users);
            const name = displayName(author);
            const likedByMe = post.buzz_likes.some((l) => l.user_id === myUserId);
            return (
              <div key={post.id} className="rounded-card border border-surface-border bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-medium text-white">{initials(name)}</div>
                  <div>
                    <p className="text-sm font-medium text-ink">{name}</p>
                    <p className="text-xs text-ink-soft">{new Date(post.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink">{post.text}</p>

                <div className="mt-3 flex items-center gap-4 border-t border-surface-border pt-3">
                  <button onClick={() => toggleLike(post)} className={clsx("flex items-center gap-1.5 text-sm", likedByMe ? "text-state-danger" : "text-ink-soft hover:text-ink")}>
                    <Heart size={16} className={likedByMe ? "fill-state-danger" : ""} />
                    {post.buzz_likes.length > 0 && post.buzz_likes.length}
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <MessageCircle size={16} /> {post.buzz_comments.length > 0 && post.buzz_comments.length}
                  </span>
                  <button className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"><Share2 size={16} /> Share</button>
                </div>

                {post.buzz_comments.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-surface-border pt-3">
                    {post.buzz_comments.map((c) => (
                      <p key={c.id} className="text-sm">
                        <span className="font-medium text-ink">{displayName(one(c.app_users))}</span>{" "}
                        <span className="text-ink-muted">{c.text}</span>
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <input
                    value={commentDraft[post.id] ?? ""}
                    onChange={(e) => setCommentDraft((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addComment(post.id)}
                    placeholder="Write a comment..."
                    className="w-full rounded-md border border-surface-border px-3 py-1.5 text-sm focus:border-brand-500"
                  />
                </div>
              </div>
            );
          })}
          {posts.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">No posts yet — be the first.</p>}
        </div>
      </div>

      <div>
        <div className="rounded-card border border-surface-border bg-white p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-medium text-ink">
            <PartyPopper size={18} className="text-brand-700" /> Upcoming anniversaries
          </h2>
          <ul className="mt-3 space-y-2">
            {anniversaries.map((a) => {
              const years = new Date().getFullYear() - new Date(a.date_joined).getFullYear();
              return (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{a.full_name}</span>
                  <span className="text-ink-muted">{new Date(a.date_joined).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {years}y</span>
                </li>
              );
            })}
            {anniversaries.length === 0 && <p className="text-sm text-ink-soft">None this month.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
