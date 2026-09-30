import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SiteLayout from "./layouts/SiteLayout";
import AppConsolePage from "./pages/AppConsolePage";
import HomePage from "./pages/HomePage";
import BiliHubPage from "./pages/BiliHubPage";
import LoginPage from "./pages/LoginPage";
import AiTrafficPage from "./pages/AiTrafficPage";
import FriendsPage from "./pages/FriendsPage";
import GuestbookPage from "./pages/GuestbookPage";
import GalleryAlbumPage from "./pages/GalleryAlbumPage";
import GlimmerPage from "./pages/GlimmerPage";
import AiGalleryPage from "./pages/AiGalleryPage";
import AboutSitePage from "./pages/AboutSitePage";
import AboutProjectPage from "./pages/AboutProjectPage";
import {
  shouldExposeAppConsole,
  shouldOpenAppConsoleAtRoot,
} from "./pwa/appAccessGate";
import PwaOwnerGate from "./pwa/PwaOwnerGate";

const RootEntry = () => {
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;
  return shouldOpenAppConsoleAtRoot({ hostname, pathname: "/" }) ? (
    <Navigate to="/app" replace />
  ) : (
    <HomePage />
  );
};

const AppConsoleEntry = () => {
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;
  return shouldExposeAppConsole({ hostname }) ? (
    <AppConsolePage />
  ) : (
    <Navigate to="/" replace />
  );
};

function App() {
  return (
    <PwaOwnerGate>
      <BrowserRouter>
        <Routes>
          <Route path="app" element={<AppConsoleEntry />} />
          <Route element={<SiteLayout />}>
            <Route index element={<RootEntry />} />
            <Route path="bili" element={<BiliHubPage />} />
            <Route path="ai-traffic" element={<AiTrafficPage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="guestbook" element={<GuestbookPage />} />
            <Route path="glimmer" element={<GlimmerPage />} />
            <Route path="gallery" element={<Navigate to="/glimmer" replace />} />
            <Route path="gallery/:albumId" element={<GalleryAlbumPage />} />
            <Route path="ai-gallery" element={<AiGalleryPage />} />
            <Route path="moments" element={<Navigate to="/glimmer" replace />} />
            <Route path="about" element={<AboutSitePage />} />
            <Route path="about/projects/:projectId" element={<AboutProjectPage />} />
            <Route path="login" element={<LoginPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PwaOwnerGate>
  );
}

export default App;
