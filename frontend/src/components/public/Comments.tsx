"use client";

import { useEffect, useMemo, useState } from "react";
import { commentsAPI } from "@/lib/api";
import { Comment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { useSettings } from "./SettingsContext";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface CommentsProps {
  postId: string;
}

export default function Comments({ postId }: CommentsProps) {
  const { settings } = useSettings();
  const tz = settings.timezone || "UTC";

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  // Honeypot field (should stay empty). Many bots fill every input.
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => content.trim().length > 0 && content.trim().length <= 5000, [content]);

  useEffect(() => {
    if (!postId) return;
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await commentsAPI.byPost(postId, { limit: 100 });
      setComments(res.data as Comment[]);
    } catch (e) {
      console.error("Failed to load comments", e);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!canSubmit) {
      setError("Please enter a comment (max 5000 characters).");
      return;
    }
    try {
      setSubmitting(true);
      await commentsAPI.create({
        postId,
        authorName: name.trim() || undefined,
        authorEmail: email.trim() || undefined,
        content: content.trim(),
        honeypot: honeypot || undefined,
      });
      setContent("");
      setSuccess("Comment submitted.");
      toast.success("Comment submitted");
      await fetchComments();
    } catch (e) {
      console.error("Failed to submit comment", e);
      setError("Failed to submit comment. Please try again.");
      toast.error("Failed to submit comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-4">Comments</h2>

      {loading ? (
        <div className="space-y-3 mb-8">
          <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
          <div className="h-20 w-full bg-muted animate-pulse rounded" />
          <div className="h-20 w-full bg-muted animate-pulse rounded" />
        </div>
      ) : (
        <div className="space-y-6 mb-8">
          {comments.length === 0 ? (
            <p className="text-muted-foreground">No comments yet. Be the first to comment.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-2">
                  <span className="font-medium">{c.authorName || "Anonymous"}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(c.createdAt, { timeZone: tz })}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{c.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Your email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {/* Honeypot field: hidden from users. Leave empty. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="hp">Website</label>
          <input
            id="hp"
            type="text"
            autoComplete="off"
            tabIndex={-1}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>
        <textarea
          placeholder="Write your comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[120px] px-4 py-2 rounded-md border bg-background"
          maxLength={5000}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <Button type="submit" disabled={!canSubmit || submitting}>
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </span>
          ) : (
            "Post Comment"
          )}
        </Button>
      </form>
    </section>
  );
}
