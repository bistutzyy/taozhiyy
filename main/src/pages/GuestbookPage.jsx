import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import EmojiPicker from "../components/EmojiPicker";
import { appendEmojiToText } from "../components/emojiInput.js";
import { flattenGuestbookThreads } from "../components/friendsApplicationThreads";
import { asList } from "../lib/asList";
import { authMe } from "../services/authApi";
import {
  deleteGuestbookMessage,
  fetchGuestbookMessages,
  hideGuestbookMessage,
  postGuestbookMessage,
} from "../services/guestbookMessagesApi";

const GUESTBOOK_CHANNEL = "guestbook";
const GUESTBOOK_MESSAGE_MAX_LENGTH = 300;
const GUESTBOOK_SUBMISSIONS_DISABLED = true;

const cardTone = (item) => {
  if (item.isAdminUser) return "admin";
  if (item.isLoginUser) return "login";
  return "guest";
};

const nameFromUser = (user) => {
  const displayName = user?.displayName?.trim();
  if (displayName) return displayName;
  return user?.email ? user.email.split("@")[0].slice(0, 12) : "";
};

const GuestbookPage = () => {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const pageSize = 20;
  const hasMore = page * pageSize < total;

  useEffect(() => {
    authMe().then(({ data }) => {
      if (data?.loggedIn && data.user) {
        setUser(data.user);
      }
    });
  }, []);

  useEffect(() => {
    const onProfileUpdated = (event) => {
      if (event.detail?.user) setUser(event.detail.user);
    };
    window.addEventListener("blog-auth-profile-updated", onProfileUpdated);
    return () => {
      window.removeEventListener("blog-auth-profile-updated", onProfileUpdated);
    };
  }, []);

  const loadPage = useCallback(async (p, append) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    const { ok, data } = await fetchGuestbookMessages(p, pageSize, {
      channel: GUESTBOOK_CHANNEL,
    });
    if (!ok) {
      setError(data.message || "加载失败");
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    setTotal(data.total ?? 0);
    setIsAdmin(!!data.isAdmin);
    const list = flattenGuestbookThreads(asList(data));
    setItems((prev) => (append ? [...prev, ...list] : list));
    setPage(p);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (GUESTBOOK_SUBMISSIONS_DISABLED) {
      setError("留言区暂时维护中，已暂停提交。");
      return;
    }
    setSubmitting(true);
    setNotice("");
    setError("");
    const payload = user
      ? { content: content.trim() }
      : { nickname: nickname.trim(), content: content.trim() };
    const { ok, data } = await postGuestbookMessage(payload, {
      channel: GUESTBOOK_CHANNEL,
    });
    setSubmitting(false);
    if (!ok) {
      if (data.error === "RATE_LIMITED") {
        setError(data.message || "留言太频繁啦，稍后再来贴小纸条吧～");
      } else {
        setError(data.message || "小纸条没有贴上，请稍后再试～");
      }
      return;
    }
    setContent("");
    setNotice("小纸条贴好啦 ✦");
    if (data.item) {
      setItems((prev) => [data.item, ...prev]);
      setTotal((t) => t + 1);
    } else {
      loadPage(1, false);
    }
  };

  const onPickEmoji = (emoji) => {
    setContent((current) =>
      appendEmojiToText(current, emoji, GUESTBOOK_MESSAGE_MAX_LENGTH),
    );
  };

  const onHide = async (id) => {
    const { ok } = await hideGuestbookMessage(id);
    if (ok) setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const onDelete = async (id) => {
    const { ok } = await deleteGuestbookMessage(id);
    if (ok) setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const displayName = nameFromUser(user);

  return (
    <section
      className="relative min-h-screen pb-28 pt-16 md:pt-20"
      style={{
        background:
          "linear-gradient(135deg, #FFF8E7 0%, #FFFDF5 45%, #EAF6FF 100%)",
      }}
    >
      <div className="relative mx-auto w-full max-w-[720px] px-4 md:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#FF8FAB]">
          Guest Notes
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#2B2B2B] md:text-4xl">
          <span className="text-[#FF8FAB]">✦</span> 留言小纸条
        </h1>
        <p className="mt-2 text-sm text-[#6B7280]">把想说的话贴在这里吧～</p>

        <form
          onSubmit={onSubmit}
          className="relative z-20 mt-8 rounded-[20px] border border-[#F2E6C9] bg-white p-5 shadow-[0_12px_30px_rgba(255,143,171,0.12)] md:p-6"
        >
          {user ? (
            <p className="mb-3 text-sm font-semibold text-[#74C0FC]">
              以 {displayName} 身份留言
            </p>
          ) : (
            <>
              <label className="mb-1 block text-xs font-semibold text-[#6B7280]">
                昵称
              </label>
              <input
                type="text"
                maxLength={12}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={GUESTBOOK_SUBMISSIONS_DISABLED}
                placeholder="给自己取个名字吧"
                className="mb-4 w-full rounded-xl border border-[#F2E6C9] bg-[#FFFBF5] px-4 py-3 text-base text-[#2B2B2B] outline-none focus:border-[#FFD43B]"
              />
            </>
          )}
          <label className="mb-1 block text-xs font-semibold text-[#6B7280]">
            留言
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={GUESTBOOK_MESSAGE_MAX_LENGTH}
            rows={4}
            required
            disabled={GUESTBOOK_SUBMISSIONS_DISABLED}
            placeholder={
              GUESTBOOK_SUBMISSIONS_DISABLED
                ? "留言区暂时维护中，已暂停提交。"
                : "写点什么吧～"
            }
            className="w-full resize-y rounded-xl border border-[#F2E6C9] bg-[#FFFBF5] px-4 py-3 text-base leading-relaxed text-[#2B2B2B] outline-none focus:border-[#FFD43B]"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-[#8A7C74]">
              {content.length}/{GUESTBOOK_MESSAGE_MAX_LENGTH}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <EmojiPicker onPick={onPickEmoji} />
              <button
                type="submit"
                disabled={GUESTBOOK_SUBMISSIONS_DISABLED || submitting}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-2 border-[#FFD43B] bg-gradient-to-r from-[#FFFDF5] to-[#FFF8E7] px-6 py-3 text-sm font-bold text-[#2B2B2B] shadow-[0_8px_24px_rgba(255,212,59,0.25)] transition hover:border-[#FF8FAB] hover:shadow-[0_10px_28px_rgba(255,143,171,0.2)] disabled:opacity-60 sm:flex-none"
              >
                {GUESTBOOK_SUBMISSIONS_DISABLED
                  ? "暂停提交"
                  : submitting
                    ? "贴上中…"
                    : "贴上小纸条"}
              </button>
            </div>
          </div>
          {GUESTBOOK_SUBMISSIONS_DISABLED && (
            <p className="mt-3 text-sm font-semibold text-[#E67700]">
              留言区暂时维护中，已暂停提交。
            </p>
          )}
          {notice && (
            <p className="mt-3 text-sm font-semibold text-[#51CF66]">{notice}</p>
          )}
          {error && (
            <p className="mt-3 text-sm text-[#E67700]">{error}</p>
          )}
        </form>

        <div className="mt-10 space-y-4">
          {loading && (
            <p className="text-sm text-[#6B7280]">加载留言中…</p>
          )}
          {!loading && items.length === 0 && (
            <div className="rounded-[18px] border border-dashed border-[#F2E6C9] bg-white/80 px-4 py-10 text-center text-sm text-[#6B7280]">
              还没有留言，来贴第一张小纸条吧 ✦
            </div>
          )}
          {items.map((item) => {
            const tone = cardTone(item);
            return (
              <article
                key={item.id}
                className={clsx(
                  "relative rounded-[18px] border p-5 shadow-[0_8px_24px_rgba(255,143,171,0.1)]",
                  tone === "guest" && "border-[#FFE066]/60 bg-[#FFF9DB]",
                  tone === "login" && "border-[#A5D8FF]/60 bg-[#E7F5FF]",
                  tone === "admin" && "border-[#FFC9C9]/70 bg-[#FFF0F6]"
                )}
              >
                {isAdmin && (
                  <div className="absolute right-3 top-3 flex gap-2">
                    {item.status === "visible" && (
                      <button
                        type="button"
                        onClick={() => onHide(item.id)}
                        className="rounded-lg border border-[#F2E6C9] bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#6B7280] hover:text-[#FF8FAB]"
                      >
                        隐藏
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="rounded-lg border border-[#FFC9C9] bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#C92A2A]"
                    >
                      删除
                    </button>
                  </div>
                )}
                <p className="pr-20 text-base font-bold text-[#2B2B2B]">
                  {item.nickname}
                  {item.isAdminUser && (
                    <span className="ml-2 text-xs font-normal text-[#FF8FAB]">
                      站长
                    </span>
                  )}
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#2B2B2B]">
                  {item.content}
                </p>
                <p className="mt-4 text-xs text-[#6B7280]">
                  {item.nickname} · {item.ipRegion || "未知地区"} · {item.createdAt}
                </p>
                {isAdmin && item.status && item.status !== "visible" && (
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-[#9775FA]">
                    状态: {item.status}
                    {item.ipMasked ? ` · IP ${item.ipMasked}` : ""}
                    {item.userAgentHash ? ` · UA ${item.userAgentHash.slice(0, 8)}…` : ""}
                  </p>
                )}
                {isAdmin && item.status === "visible" && (item.ipMasked || item.userAgentHash) && (
                  <p className="mt-2 text-[10px] text-[#ADB5BD]">
                    {item.ipMasked ? `IP ${item.ipMasked}` : ""}
                    {item.ipMasked && item.userAgentHash ? " · " : ""}
                    {item.userAgentHash ? `UA ${item.userAgentHash.slice(0, 8)}…` : ""}
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {hasMore && !loading && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => loadPage(page + 1, true)}
            className="mt-8 min-h-[44px] w-full rounded-full border border-[#F2E6C9] bg-white px-6 py-3 text-sm font-semibold text-[#2B2B2B] shadow-sm hover:border-[#74C0FC] disabled:opacity-60"
          >
            {loadingMore ? "加载中…" : "加载更多"}
          </button>
        )}
      </div>
    </section>
  );
};

export default GuestbookPage;
