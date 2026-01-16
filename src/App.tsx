import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
// Lazy load pages for performance
const Home = React.lazy(() => import('./pages/Home'));
const Category = React.lazy(() => import('./pages/Category'));
const Viewer = React.lazy(() => import('./pages/Viewer'));
const Admin = React.lazy(() => import('./pages/Admin'));

const App: React.FC = () => {
  // Use the same base path as Vite config
  // BASE_URL from Vite includes the trailing slash, but React Router basename shouldn't
  const baseUrl = import.meta.env.BASE_URL || '/';
  // Remove trailing slash for React Router basename
  const basename = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
  
  return (
    <BrowserRouter basename={basename}>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="worksheets" element={<Category />} />
            <Route path="games" element={<Category />} />
            <Route path="tools" element={<Category />} />
            <Route path="files" element={<Category />} />
            <Route path="resource/:id" element={<Viewer />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
