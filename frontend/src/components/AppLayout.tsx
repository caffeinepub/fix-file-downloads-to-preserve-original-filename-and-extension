import { useInternetIdentity } from '../hooks/useInternetIdentity';
import LoginButton from './LoginButton';
import { FileText, History } from 'lucide-react';
import { SiX } from 'react-icons/si';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
}

export default function AppLayout({ children, currentPath }: AppLayoutProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const handleNavigate = (path: string) => {
    window.location.hash = path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleNavigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">PasteShare</span>
            </button>
            
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <button
                  onClick={() => handleNavigate('/history')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </button>
              )}
              <LoginButton />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t bg-card/30 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} PasteShare. All rights reserved.</p>
            <p>
              Built with ❤️ using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
