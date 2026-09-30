import { Link, Navigate, useParams } from "react-router-dom";
import { TiLocationArrow } from "react-icons/ti";
import { getGalleryAlbum } from "../data/galleryAlbums";

const GalleryAlbumPage = () => {
  const { albumId } = useParams();
  const album = getGalleryAlbum(albumId);

  if (!album) return <Navigate to="/glimmer" replace />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff8f1] pt-24 text-[#241322]">
      <div
        className={`pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br ${album.tone}`}
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed -right-24 top-28 -z-10 h-80 w-80 rounded-full bg-white/55 blur-3xl" />

      <header className="container mx-auto px-5 pb-8 md:px-10">
        <Link
          to="/glimmer"
          className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#5f4b52] shadow-[0_14px_38px_rgba(95,75,82,0.12)] backdrop-blur-md"
        >
          <TiLocationArrow className="rotate-180" />
          浮光集
        </Link>

        <div className="mt-8 grid gap-7 md:grid-cols-[0.9fr_1.1fr] md:items-end">
          <div>
            <p className="font-general text-xs uppercase tracking-[0.45em] text-[#b76e79]">
              {album.eyebrow}
            </p>
            <h1 className="mt-3 font-zentry text-5xl font-black uppercase leading-none md:text-7xl">
              {album.title}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[#5f4b52]">
              {album.description}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/45 p-3 shadow-[0_28px_90px_rgba(95,75,82,0.16)]">
            <img
              src={album.cover}
              alt={album.title}
              className="h-[22rem] w-full rounded-[1.45rem] object-cover md:h-[30rem]"
              fetchPriority="high"
            />
            <div className="absolute bottom-6 right-6 rounded-full border border-white/45 bg-white/75 px-4 py-2 font-general text-[10px] uppercase tracking-[0.28em] text-[#5f4b52] backdrop-blur-md">
              {album.images.length} Frames
            </div>
          </div>
        </div>
      </header>

      <section className="container mx-auto columns-1 gap-5 px-5 pb-24 md:columns-2 md:px-10 lg:columns-3">
        {album.images.map((src, index) => (
          <figure
            key={src}
            className="mb-5 break-inside-avoid overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/55 p-2 shadow-[0_18px_58px_rgba(95,75,82,0.12)]"
          >
            <img
              src={src}
              alt={`${album.title} ${index + 1}`}
              className="w-full rounded-[1.25rem] object-cover"
              loading={index < 3 ? "eager" : "lazy"}
            />
            <figcaption className="flex items-center justify-between px-3 py-3 font-general text-[10px] uppercase tracking-[0.24em] text-[#8b6f63]">
              <span>{album.title}</span>
              <span>{String(index + 1).padStart(2, "0")}</span>
            </figcaption>
          </figure>
        ))}
      </section>
    </div>
  );
};

export default GalleryAlbumPage;
