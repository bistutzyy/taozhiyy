import AcgNavigation from "../components/AcgNavigation";

const BiliHubPage = () => (
  <div className="bili-hub-page seasonal-page seasonal-page--autumn relative min-h-screen overflow-hidden px-3 pb-20 pt-24">
    <div
      className="bili-hub-backdrop pointer-events-none fixed inset-0 -z-10"
      aria-hidden
    />
    <div className="seasonal-scene seasonal-scene--autumn" aria-hidden="true">
      <div className="autumn-wave-stage">
        <svg className="autumn-wave autumn-wave--1" viewBox="0 0 2880 220" preserveAspectRatio="none">
          <path fill="#f6e3b2" d="M0 130C240 70 480 70 720 130S1200 190 1440 130V220H0Z" />
          <path fill="#f6e3b2" d="M1440 130C1680 70 1920 70 2160 130S2640 190 2880 130V220H1440Z" />
        </svg>
        <svg className="autumn-wave autumn-wave--2" viewBox="0 0 2880 240" preserveAspectRatio="none">
          <path fill="#f3c9a2" d="M0 100C240 170 480 170 720 100S1200 30 1440 100V240H0Z" />
          <path fill="#f3c9a2" d="M1440 100C1680 170 1920 170 2160 100S2640 30 2880 100V240H1440Z" />
        </svg>
        <svg className="autumn-wave autumn-wave--3" viewBox="0 0 2880 260" preserveAspectRatio="none">
          <path fill="#e7b48c" d="M0 140C240 78 480 78 720 140S1200 202 1440 140V260H0Z" />
          <path fill="#e7b48c" d="M1440 140C1680 78 1920 78 2160 140S2640 202 2880 140V260H1440Z" />
        </svg>
        <svg className="autumn-wave autumn-wave--4" viewBox="0 0 2880 240" preserveAspectRatio="none">
          <path fill="#f8e7cf" d="M0 108C240 156 480 156 720 108S1200 60 1440 108V240H0Z" />
          <path fill="#f8e7cf" d="M1440 108C1680 156 1920 156 2160 108S2640 60 2880 108V240H1440Z" />
        </svg>
      </div>
      <span className="autumn-recipes-leaf-layer">
        <i className="autumn-recipes-leaf autumn-recipes-leaf--yellow autumn-recipes-leaf--one" />
        <i className="autumn-recipes-leaf autumn-recipes-leaf--yellow autumn-recipes-leaf--two" />
        <i className="autumn-recipes-leaf autumn-recipes-leaf--yellow autumn-recipes-leaf--three" />
        <i className="autumn-recipes-leaf autumn-recipes-leaf--yellow autumn-recipes-leaf--four" />
        <i className="autumn-recipes-leaf autumn-recipes-leaf--yellow autumn-recipes-leaf--five" />
      </span>
    </div>

    <div className="autumn-recipes-shell">
      <AcgNavigation />
    </div>
  </div>
);

export default BiliHubPage;
