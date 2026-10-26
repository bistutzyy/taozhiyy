import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { I18nProvider } from './i18n/I18nContext';
import { ArchivesPage } from './pages/ArchivesPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { HomePage } from './pages/HomePage';

const PostPage = lazy(() => import('./pages/PostPage').then(module => ({ default: module.PostPage })));

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

export function App() {
  return (
    <I18nProvider>
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/archives" element={<ArchivesPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/post/:slug" element={<Suspense fallback={<div className="archive-route-placeholder" aria-busy="true" />}><PostPage /></Suspense>} />
              <Route path="/gallery/*" element={<ExternalRedirect to="/gallery" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
    </I18nProvider>
  );
}
