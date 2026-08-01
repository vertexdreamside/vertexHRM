"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2, Image as ImageIcon, PartyPopper } from "lucide-react";
import { clsx } from "clsx";
import type { BuzzPost, UpcomingAnniversary } from "@/lib/types";

const SEED_POSTS: BuzzPost[] = [
  {
    id: "1", authorName: "Marie Dubel",
    text: "Great turnout at yesterday's community clean-up drive — thanks to everyone who joined!",
    postedAt: "2026-08-01 09:10", likes: 4, likedByMe: false,
    comments: [{ id: "1", authorName: "Selvan Pillay", text: "Wish I could've made it — next time!" }]
  },
  {
    id: "2", authorName: "Jules Esparon",
    text: "Reminder: office closed Monday for Constitution Day. Have a good long weekend everyone.",
    postedAt: "2026-06-17 14:30", likes: 7, likedByMe: true, comments: []
  }
];

const SEED_ANNIVERSARIES: UpcomingAnniversary[] = [
  { id: "1", employeeName: "Marie Dubel", date: "Aug 15", years: 5 },
  { id: "2", employeeName: "Aurelie Confait", date: "Aug 22", years: 2 }
];

export default function BuzzPage() {
  const [posts, setPosts] = useState<BuzzPost[]>(SEED_POSTS);
  const [draft, setDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  function publish() {
    if (!draft.trim()) return;
    const newPost: BuzzPost = {
      id: crypto.randomUUID(),
      authorName: "You",
      text: draft.trim(),
      postedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      likes: 0,
      likedByMe: false,
      comments: []
    };
    setPosts((prev) => [newPost, ...prev]);
    setDraft("");
    // TODO(supabase): insert into `buzz_posts`; image attachment (if
    // added) uploads to Storage bucket `buzz` first.
  }

  function toggleLike(id: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) }
          : p
      )
    );
  }

  function addComment(id: string) {
    const text = commentDraft[id]?.trim();
    if (!text) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, comments: [...p.comments, { id: crypto.randomUUID(), authorName: "You", text }] }
          : p
      )
    );
    setCommentDraft((prev) => ({ ...prev, [id]: "" }));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="font-display text-2xl font-medium text-ink">Buzz</h1>
        <p className="mt-1 text-sm text-ink-muted">The company newsfeed.</p>

        <div className="mt-6 rounded-card border border-surface-border bg-white p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full resize-none rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
              title="Image attachments not wired to storage yet"
            >
              <ImageIcon size={16} /> Photo
            </button>
            <button
              onClick={publish}
              className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Post
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="rounded-card border border-surface-border bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-medium text-white">
                  {post.authorName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{post.authorName}</p>
                  <p className="text-xs text-ink-soft">{post.postedAt}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink">{post.text}</p>

              <div className="mt-3 flex items-center gap-4 border-t border-surface-border pt-3">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={clsx(
                    "flex items-center gap-1.5 text-sm",
                    post.likedByMe ? "text-state-danger" : "text-ink-soft hover:text-ink"
                  )}
                >
                  <Heart size={16} className={post.likedByMe ? "fill-state-danger" : ""} />
                  {post.likes > 0 && post.likes}
                </button>
                <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                  <MessageCircle size={16} /> {post.comments.length > 0 && post.comments.length}
                </span>
                <button className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
                  <Share2 size={16} /> Share
                </button>
              </div>

              {post.comments.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-surface-border pt-3">
                  {post.comments.map((c) => (
                    <p key={c.id} className="text-sm">
                      <span className="font-medium text-ink">{c.authorName}</span>{" "}
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
          ))}
        </div>
      </div>

      <div>
        <div className="rounded-card border border-surface-border bg-white p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-medium text-ink">
            <PartyPopper size={18} className="text-brand-700" /> Upcoming anniversaries
          </h2>
          <ul className="mt-3 space-y-2">
            {SEED_ANNIVERSARIES.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{a.employeeName}</span>
                <span className="text-ink-muted">{a.date} · {a.years}y</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
