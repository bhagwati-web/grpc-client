import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import './index.css'
import Page from './app/dashboard/page.tsx';
import SettingsPage from './app/settings/page.tsx';
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
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        <Toaster />
      </GrpcProvider>
    </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
