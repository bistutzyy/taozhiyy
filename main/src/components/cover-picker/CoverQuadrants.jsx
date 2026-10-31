import { QUAD_REGIONS, QUAD_SEAMS } from "./quadGeometry.js";
import "./quad-backdrop.css";

export default function CoverQuadrants({
  covers,
  readyIndexes,
  failedIndexes,
  highlightedIndex = null,
  previewIndex,
  hidden = false,
}) {
  const ready = (index) => readyIndexes.has(index) && !failedIndexes.has(index);
  const framedCovers = covers.slice(0, QUAD_REGIONS.length);
  const activePosition = framedCovers.findIndex(
    ({ index }) => index === highlightedIndex && ready(index),
  );
  return (
    <div
      className="cover-quadrants"
      aria-hidden="true"
      hidden={hidden}
      data-highlight-index={activePosition < 0 ? "" : highlightedIndex}
      data-preview-index={hidden ? undefined : previewIndex}
    >
      {framedCovers.map(({ index, src }, position) => {
        const lit = activePosition === position;
        return (
          <div
            key={index}
            className={`cover-quadrants__panel${lit ? " is-lit" : ""}`}
            style={QUAD_REGIONS[position].style}
            data-quad-index={index}
            data-quad-ready={ready(index)}
            data-lit={lit}
          >
            {ready(index) && <img src={src} alt="" draggable="false" />}
          </div>
        );
      })}
      <svg
        className="cover-quadrants__seams"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {QUAD_SEAMS.map((points, index) => (
          <polyline
            key={index}
            points={points.map((point) => point.join(",")).join(" ")}
          />
        ))}
        {activePosition >= 0 && (
          <polygon
            className="cover-quadrants__accent"
            points={QUAD_REGIONS[activePosition].points
              .map((point) => point.join(","))
              .join(" ")}
          />
        )}
      </svg>
    </div>
  );
}
