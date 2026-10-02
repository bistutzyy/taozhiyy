import { useState } from "react";
import { FiCopy, FiExternalLink } from "react-icons/fi";

import FriendsApplicationBoard from "../components/FriendsApplicationBoard";
import { friendCards } from "../data/friendCards";
import { cosAsset } from "../lib/cosAsset.js";

const siteAvatarUrl = `https://taozhiyy.top${cosAsset("1.png")}`;
const copyBlock = `name: 桃之夭夭
desc: 桃之夭夭的小屋
url: https://taozhiyy.top
avatar: ${siteAvatarUrl}`;

const winterSnowflakes = Array.from({ length: 42 }, (_, index) => {
  const left = (index * 17 + 5) % 100;
  const size = 0.92 + ((index * 7) % 10) / 10;
  const duration = 7.5 + ((index * 5) % 8) / 2;
  const delay = -((index * 11) % 12);
  const drift = ((index % 2 === 0 ? 1 : -1) * (3 + ((index * 3) % 8)));
  const rotate = (index * 29) % 80 - 40;

  return {
    id: `snow-${index + 1}`,
    style: {
      "--snow-left": `${left}vw`,
      "--snow-size": `${size.toFixed(2)}rem`,
      "--snow-duration": `${duration.toFixed(1)}s`,
      "--snow-delay": `${delay}s`,
      "--snow-drift": `${drift}vw`,
      "--snow-rotate": `${rotate}deg`,
    },
  };
});

const friendAvatarInitial = (name = "") => {
  const [initial] = Array.from(name.trim());
  return initial?.toUpperCase() || "友";
};

const FriendsPage = () => {
  const [copied, setCopied] = useState(false);
  const [failedFriendAvatars, setFailedFriendAvatars] = useState(() => new Set());

  const handleFriendAvatarError = (name) => {
    setFailedFriendAvatars((current) => {
      if (current.has(name)) return current;

      const next = new Set(current);
      next.add(name);
      return next;
    });
  };

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
    <section className="friends-page seasonal-page seasonal-page--winter relative min-h-screen overflow-hidden pb-24 pt-20 text-[#2B2B2B] md:pt-24">
      <div className="seasonal-scene seasonal-scene--winter" aria-hidden="true">
        <span className="winter-snowfall-field">
          {winterSnowflakes.map((snowflake) => (
            <span
              key={snowflake.id}
              className="winter-floating-snow"
              style={snowflake.style}
            />
          ))}
        </span>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <header className="seasonal-hero seasonal-hero--winter friends-winter-hero--frameless mx-auto max-w-5xl text-center">
          <p className="seasonal-hero__kicker text-[11px] font-semibold uppercase tracking-[0.34em] text-[#B76E79]">
            Friends Page
          </p>
          <h1 className="seasonal-hero__title mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#2B2B2B] md:text-6xl">
            友链
          </h1>
          <p className="seasonal-hero__text mt-5 text-sm leading-8 text-[#6B7280] md:text-base lg:text-lg lg:whitespace-nowrap">
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
            {friendCards.map((friend) => {
              const avatarFailed = !friend.avatar || failedFriendAvatars.has(friend.name);

              return (
                <a
                  key={friend.name}
                  href={friend.url}
                  target="_blank"
                  rel="noreferrer"
                  className="friends-winter-card group block p-5 transition duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      {avatarFailed ? (
                        <span
                          aria-label={`${friend.name} 默认头像`}
                          className="friends-winter-avatar flex h-16 w-16 shrink-0 items-center justify-center text-xl font-bold"
                        >
                          {friendAvatarInitial(friend.name)}
                        </span>
                      ) : (
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                          onError={() => handleFriendAvatarError(friend.name)}
                          className="friends-winter-avatar h-16 w-16 object-cover"
                        />
                      )}
                      <div>
                        <p className="text-lg font-semibold text-[#2B2B2B]">{friend.name}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#74C0FC]">
                          {friend.note}
                        </p>
                      </div>
                    </div>
                    <FiExternalLink
                      className="mt-1 h-4 w-4 text-[#6EA8D7] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </div>
                  <p className="mt-5 text-sm leading-7 text-[#6B7280]">{friend.desc}</p>
                </a>
              );
            })}
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

          <div className="friends-verse-panel friends-winter-link-panel mt-6 overflow-hidden">
            <div className="friends-verse-panel__chrome friends-winter-link-panel__chrome">
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
                className="friends-winter-copy-button inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-[#F2E6C9] bg-white px-4 py-2 text-sm font-semibold text-[#5F4B52] transition hover:border-[#FFD43B] hover:text-[#2B2B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74C0FC]/30"
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
