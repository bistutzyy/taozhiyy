import AcgNavigation from "../components/AcgNavigation";

const BiliHubPage = () => (
  <div className="bili-hub-page seasonal-page seasonal-page--autumn relative min-h-screen overflow-hidden px-3 pb-20 pt-24">
    <div
      className="bili-hub-backdrop pointer-events-none fixed inset-0 -z-10"
      aria-hidden
    />
    <div className="seasonal-scene seasonal-scene--autumn" aria-hidden="true">
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
