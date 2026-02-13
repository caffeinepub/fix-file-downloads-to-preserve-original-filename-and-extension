import { useInternetIdentity } from '../hooks/useInternetIdentity';
import LoginButton from './LoginButton';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
}

export default function AppLayout({ children, currentPath }: AppLayoutProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const handleLogoClick = () => {
    window.location.hash = '/';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img
              src="/assets/generated/logo-mark.dim_512x512.png"
              alt="PasteBin"
              className="h-10 w-10"
            />
            <div className="flex flex-col items-start">
              <h1 className="text-xl font-bold text-foreground">PasteBin</h1>
              <p className="text-xs text-muted-foreground">Share files securely</p>
            </div>
          </button>
          <div className="flex items-center gap-4">
            {isAuthenticated && currentPath !== '/' && (
              <button
                onClick={handleLogoClick}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Create New
              </button>
            )}
            <LoginButton />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-border bg-card/30 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} · Built with{' '}
            <span className="text-red-500">♥</span> using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline font-medium"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
