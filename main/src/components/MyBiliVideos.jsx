import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuArrowUpRight,
  LuCalendarDays,
  LuClock3,
  LuPlay,
  LuVideo,
  LuX,
} from "react-icons/lu";
import { biliOwner, ownerVideos } from "../data/biliOwnerVideos.js";
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
  const [coverFailed, setCoverFailed] = useState(false);
  return (
    <article className="owner-video-card" data-video-bvid={video.bvid}>
      <button
        className="owner-video-card__cover"
        type="button"
        onClick={() => onPlay(video)}
        aria-label={`播放：${video.title}`}
        title={`播放：${video.title}`}
      >
        {!coverFailed && (
          <img
            src={video.cover}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setCoverFailed(true)}
          />
        )}
        {coverFailed && (
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

export default function MyBiliVideos({ videos = ownerVideos }) {
  const [playingVideo, setPlayingVideo] = useState(null);
  const publicVideos = videos.filter((video) => getBiliVideoHref(video.bvid));
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
          href={biliOwner.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {biliOwner.name}
          <LuArrowUpRight aria-hidden="true" />
        </a>
      </header>
      <div
        className="owner-videos__grid"
        data-layout={getVideoGridVariant(publicVideos.length)}
      >
        {publicVideos.map((video) => (
          <VideoCard key={video.bvid} video={video} onPlay={setPlayingVideo} />
        ))}
      </div>
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
