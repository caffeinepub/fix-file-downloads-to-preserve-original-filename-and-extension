import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from './components/AppLayout';
import CreatePastePage from './pages/CreatePastePage';
import PasteViewPage from './pages/PasteViewPage';
import HistoryPage from './pages/HistoryPage';
import { extractPasteIdFromRoute, isValidPasteId } from './utils/pasteIds';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      const newPath = window.location.hash.slice(1) || '/';
      console.log('[App] Hash changed to:', newPath);
      setCurrentPath(newPath);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderPage = () => {
    console.log('[App] Rendering page for path:', currentPath);

    if (currentPath === '/' || currentPath === '') {
      console.log('[App] Rendering CreatePastePage');
      return <CreatePastePage />;
    }

    if (currentPath === '/history') {
      console.log('[App] Rendering HistoryPage');
      return <HistoryPage />;
    }

    // Extract and validate paste ID from the current path
    const pasteId = extractPasteIdFromRoute(currentPath);
    console.log('[App] Extracted paste ID from route:', pasteId);
    
    if (isValidPasteId(pasteId)) {
      console.log('[App] Valid paste ID, rendering PasteViewPage');
      return <PasteViewPage pasteId={pasteId} />;
    }

    // If no valid paste ID found, default to create page
    console.log('[App] Invalid paste ID, defaulting to CreatePastePage');
    return <CreatePastePage />;
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AppLayout currentPath={currentPath}>
          {renderPage()}
        </AppLayout>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
