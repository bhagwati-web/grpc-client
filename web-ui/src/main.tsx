import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import './index.css'
import Page from './app/dashboard/page.tsx';
import SettingsPage from './app/settings/page.tsx';
import HelpPage from './app/help/page.tsx';
import RestPage from './app/rest/page.tsx';
import { GrpcProvider } from './providers/GrpcContext';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from "@/providers/theme-provider"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <GrpcProvider>
        <Routes>
          <Route path="/" element={<Page />} />
          <Route path="/dashboard" element={<Page />} />
          <Route path="/rest" element={<RestPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Routes>
        <Toaster />
      </GrpcProvider>
    </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
