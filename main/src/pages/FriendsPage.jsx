import { useState } from "react";
import { FiCopy, FiExternalLink } from "react-icons/fi";

import FriendsApplicationBoard from "../components/FriendsApplicationBoard";
import { friendCards } from "../data/friendCards";
import { cosAsset } from "../lib/cosAsset.js";

const siteAvatarUrl = `https://taozhiyy.top${cosAsset("1.png")}`;
const friendAvatarPlaceholder = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#EEF2F6"/><circle cx="64" cy="47" r="20" fill="#A7B3C2"/><path d="M28 105c4-22 18-34 36-34s32 12 36 34" fill="#A7B3C2"/></svg>',
)}`;

const copyBlock = `name: 桃之夭夭
desc: 桃之夭夭的小屋
url: https://taozhiyy.top
avatar: ${siteAvatarUrl}`;

const handleFriendAvatarError = ({ currentTarget }) => {
  if (currentTarget.dataset.fallbackAvatar === "true") return;

  currentTarget.dataset.fallbackAvatar = "true";
  currentTarget.src = friendAvatarPlaceholder;
};

const FriendsPage = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyBlock);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#fffaf2] pb-24 pt-20 text-[#2B2B2B] md:pt-24">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 12% 16%, rgba(255, 214, 184, 0.34), transparent 22rem), radial-gradient(circle at 88% 14%, rgba(165, 216, 255, 0.25), transparent 24rem), linear-gradient(180deg, #fffaf2 0%, #fffdf7 48%, #f6fbff 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-[-4rem] top-40 h-56 w-56 rounded-full bg-[#FFD6B8]/28 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-4rem] top-56 h-60 w-60 rounded-full bg-[#DCEEFF]/28 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <header className="mx-auto max-w-5xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#B76E79]">
            Friends Page
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#2B2B2B] md:text-6xl">
            友链
          </h1>
          <p className="mt-5 text-sm leading-8 text-[#6B7280] md:text-base lg:text-lg lg:whitespace-nowrap">
            风会替信纸赶路，链接会替心意停留。若你也愿意把小屋的灯留给远方的人，这里便是交换名字的地方。
          </p>
        </header>

        <section className="mt-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#74C0FC]">
                Friends Grid
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#2B2B2B]">
                小伙伴卡片
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#6B7280]">
              这里先把认真交换过的名字收好。后面若有新的小屋慢慢靠岸，也会在这里一点点亮起来。
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {friendCards.map((friend) => (
              <a
                key={friend.name}
                href={friend.url}
                target="_blank"
                rel="noreferrer"
                className="group block rounded-[28px] border border-[#F0E3D8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,241,0.94))] p-5 shadow-[0_18px_44px_rgba(95,75,82,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(95,75,82,0.14)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      onError={handleFriendAvatarError}
                      className="h-16 w-16 rounded-[20px] object-cover shadow-[0_10px_24px_rgba(95,75,82,0.16)]"
                    />
                    <div>
                      <p className="text-lg font-semibold text-[#2B2B2B]">{friend.name}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#74C0FC]">
                        {friend.note}
                      </p>
                    </div>
                  </div>
                  <FiExternalLink
                    className="mt-1 h-4 w-4 text-[#B76E79] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </div>
                <p className="mt-5 text-sm leading-7 text-[#6B7280]">{friend.desc}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#74C0FC]">
                My Link
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#2B2B2B]">
                我的友链
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#6B7280]">
              留下四行刚刚好的自我介绍，方便被复制，也方便在别人的页面里安静落下。
            </p>
          </div>

          <div className="friends-verse-panel mt-6 overflow-hidden rounded-[28px] border border-[#F2E6C9] bg-white/92">
            <div className="friends-verse-panel__chrome">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#FF8FAB]" />
                <span className="h-3 w-3 rounded-full bg-[#FFD43B]" />
                <span className="h-3 w-3 rounded-full bg-[#74C0FC]" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9AA4B2]">
                friend-card.yaml
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-[#F2E6C9] bg-white px-4 py-2 text-sm font-semibold text-[#5F4B52] transition hover:border-[#FFD43B] hover:text-[#2B2B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74C0FC]/30"
              >
                <FiCopy className="h-4 w-4" aria-hidden />
                {copied ? "已复制" : "复制"}
              </button>
            </div>

            <pre className="overflow-x-auto px-5 py-5 text-sm leading-8 text-[#2B2B2B] md:px-6 md:py-6">
              {copyBlock}
            </pre>
          </div>
        </section>

        <div className="mt-12">
          <FriendsApplicationBoard />
        </div>
      </div>
    </section>
  );
};

export default FriendsPage;
