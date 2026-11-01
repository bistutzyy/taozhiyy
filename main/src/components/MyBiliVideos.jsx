import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuArrowUpRight,
  LuCalendarDays,
  LuClock3,
  LuChevronDown,
  LuPlay,
  LuVideo,
  LuX,
} from "react-icons/lu";
import { biliOwner, ownerVideos } from "../data/biliOwnerVideos.js";
import {
  getBiliOwnerFeed,
  getBiliSyncNotice,
} from "../services/biliOwnerApi.js";
import {
  formatVideoDate,
  getBiliEmbedSrc,
  getBiliVideoHref,
  getVideoGridVariant,
} from "./biliVideoModel.js";
import "./my-bili-videos.css";

function BiliVideoPlayer({ video, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const savedOverflow = ["overflow", "overflow-x", "overflow-y"].map(
      (property) => ({
        property,
        value: document.body.style.getPropertyValue(property),
        priority: document.body.style.getPropertyPriority(property),
      }),
    );
    dialog.showModal();
    document.body.style.setProperty("overflow", "hidden");
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      savedOverflow.forEach(({ property }) =>
        document.body.style.removeProperty(property),
      );
      savedOverflow.forEach(({ property, value, priority }) => {
        if (value) document.body.style.setProperty(property, value, priority);
      });
      if (opener?.isConnected) opener.focus?.({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialogRef}
      className="bili-video-player"
      aria-labelledby="bili-player-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div>
        <header>
          <span>
            <LuVideo aria-hidden="true" /> BILIBILI
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="关闭视频"
            title="关闭视频"
          >
            <LuX aria-hidden="true" />
          </button>
        </header>
        <div className="bili-video-player__screen">
          <iframe
            src={getBiliEmbedSrc(video.bvid)}
            title={`B站视频：${video.title}`}
            allow="fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <footer>
          <h2 id="bili-player-title">{video.title}</h2>
          <a
            href={getBiliVideoHref(video.bvid)}
            target="_blank"
            rel="noopener noreferrer"
          >
            B站观看 <LuArrowUpRight aria-hidden="true" />
          </a>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}

function VideoCard({ video, onPlay }) {
  const [failedCover, setFailedCover] = useState(null);
  const coverFailed = failedCover === video.cover;
  return (
    <article className="owner-video-card" data-video-bvid={video.bvid}>
      <button
        className="owner-video-card__cover"
        type="button"
        onClick={() => onPlay(video)}
        aria-label={`播放：${video.title}`}
        title={`播放：${video.title}`}
      >
        {video.cover && !coverFailed && (
          <img
            src={video.cover}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailedCover(video.cover)}
          />
        )}
        {(!video.cover || coverFailed) && (
          <LuVideo className="owner-video-card__fallback" aria-hidden="true" />
        )}
        <span className="owner-video-card__play" aria-hidden="true">
          <LuPlay />
        </span>
        <span className="owner-video-card__duration">
          <LuClock3 aria-hidden="true" />
          {video.duration}
        </span>
      </button>
      <div className="owner-video-card__details">
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        <div className="owner-video-card__footer">
          <time dateTime={video.publishedAt}>
            <LuCalendarDays aria-hidden="true" />
            {formatVideoDate(video.publishedAt)}
          </time>
          <a
            href={getBiliVideoHref(video.bvid)}
            target="_blank"
            rel="noopener noreferrer"
          >
            B站观看 <LuArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function MyBiliVideos({ videos }) {
  const [playingVideo, setPlayingVideo] = useState(null);
  const [feed, setFeed] = useState({ owner: biliOwner, items: ownerVideos });
  const [syncNotice, setSyncNotice] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const gridRef = useRef(null);
  const sourceVideos = videos === undefined ? feed.items : videos;
  const owner = videos === undefined ? feed.owner : biliOwner;
  const publicVideos = (Array.isArray(sourceVideos) ? sourceVideos : []).filter(
    (video) => video && getBiliVideoHref(video.bvid),
  );

  useEffect(() => {
    if (videos !== undefined) return;
    const controller = new AbortController();
    let active = true;
    getBiliOwnerFeed({ signal: controller.signal })
      .then((result) => {
        if (!active) return;
        if (result.ready) {
          setFeed(result);
        }
        setSyncNotice(getBiliSyncNotice(result));
      })
      .catch((error) => {
        if (active && error.name !== "AbortError")
          setSyncNotice("暂用已收录视频");
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [videos]);

  useEffect(() => {
    setVisibleCount(6);
  }, [sourceVideos]);
  useEffect(() => {
    if (
      playingVideo &&
      !sourceVideos?.some((video) => video?.bvid === playingVideo.bvid)
    )
      setPlayingVideo(null);
  }, [playingVideo, sourceVideos]);

  const loadMore = () => {
    const nextCard = visibleCount;
    setVisibleCount((count) => count + 6);
    requestAnimationFrame(() => {
      const buttons = gridRef.current?.querySelectorAll(
        ".owner-video-card__cover",
      );
      buttons?.[nextCard]?.focus({ preventScroll: true });
    });
  };
  return (
    <section className="owner-videos" aria-labelledby="owner-videos-title">
      <header className="owner-videos__heading">
        <div>
          <p className="owner-videos__eyebrow">
            <LuVideo aria-hidden="true" /> MY UPLOADS
          </p>
          <h2 id="owner-videos-title">
            我的视频 <span>{publicVideos.length} 条投稿</span>
          </h2>
        </div>
        <a
          className="owner-videos__profile"
          href={owner.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {owner.name}
          <LuArrowUpRight aria-hidden="true" />
        </a>
      </header>
      {videos === undefined && syncNotice && (
        <p className="owner-videos__sync-status" role="status">
          {syncNotice}
        </p>
      )}
      <div
        ref={gridRef}
        className="owner-videos__grid"
        data-layout={getVideoGridVariant(publicVideos.length)}
      >
        {publicVideos.slice(0, visibleCount).map((video) => (
          <VideoCard key={video.bvid} video={video} onPlay={setPlayingVideo} />
        ))}
      </div>
      {visibleCount < publicVideos.length && (
        <div className="owner-videos__more">
          <button type="button" onClick={loadMore} aria-label="加载更多视频">
            <LuChevronDown aria-hidden="true" />
            加载更多 <span>{publicVideos.length - visibleCount}</span>
          </button>
        </div>
      )}
      {!publicVideos.length && (
        <p className="owner-videos__empty">还没有公开的视频</p>
      )}
      {playingVideo && (
        <BiliVideoPlayer
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </section>
  );
}
