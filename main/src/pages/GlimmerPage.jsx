import { Link } from "react-router-dom";
import { galleryAlbums } from "../data/galleryAlbums";
import { moments } from "../data/moments";

const momentDateTime = (moment) => {
  const [month, day] = moment.date.split(".");
  return `${moment.year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const GlimmerPage = () => (
  <div className="glimmer-page">
    <div className="glimmer-page-bg" aria-hidden="true">
      <span className="glimmer-page-glow glimmer-page-glow--rose" />
      <span className="glimmer-page-glow glimmer-page-glow--mint" />
      <span className="glimmer-page-glow glimmer-page-glow--sun" />
    </div>

    <header className="glimmer-page-hero">
      <h1>浮光集</h1>
      <p className="glimmer-page-subtitle">
        一面收住照片，一面摊开短句。把看见的、想起的，都放在这里。
      </p>
    </header>

    <section className="glimmer-albums" aria-label="相册集">
      <div className="glimmer-section-head">
        <h2>相册集</h2>
        <span>Album Shelf</span>
      </div>
      <div className="glimmer-album-grid">
        {galleryAlbums.map((album) => (
          <Link
            key={album.id}
            to={`/gallery/${album.id}`}
            className="glimmer-polaroid"
            aria-label={`打开${album.title}相册`}
          >
            <img src={album.cover} alt={album.title} loading="lazy" />
            <span>
              {album.title} [{album.images.length}]
            </span>
          </Link>
        ))}
      </div>
    </section>

    <section className="glimmer-notes" aria-label="碎语">
      <div className="glimmer-section-head">
        <h2>碎语</h2>
        <span>All Notes</span>
      </div>
      <div className="glimmer-notes-grid">
        {moments.map((moment) => (
          <article
            key={`${moment.year}-${moment.date}-${moment.type}`}
            className={`glimmer-note glimmer-note--${moment.tone}`}
          >
            <div className="glimmer-note-meta">
              <time dateTime={momentDateTime(moment)}>
                {moment.year} · {moment.date}
              </time>
              <span>{moment.type}</span>
            </div>
            <div className="glimmer-note-lines">
              {moment.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            {moment.image && (
              <figure className="glimmer-note-photo">
                <img src={moment.image.src} alt={moment.image.alt} loading="lazy" />
              </figure>
            )}
          </article>
        ))}
      </div>
    </section>
  </div>
);

export default GlimmerPage;
