import { AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorStateProps {
  type: 'not-found' | 'expired' | 'error';
  message?: string;
}

export default function ErrorState({ type, message }: ErrorStateProps) {
  const getContent = () => {
    switch (type) {
      case 'expired':
        return {
          icon: <Clock className="h-12 w-12 text-muted-foreground" />,
          title: 'Link Expired',
          description: message || 'Link expired — contact the sender to resend the content.',
        };
      case 'not-found':
        return {
          icon: <AlertCircle className="h-12 w-12 text-muted-foreground" />,
          title: 'Not Found',
          description: message || 'This paste does not exist or has been deleted.',
        };
      default:
        return {
          icon: <AlertCircle className="h-12 w-12 text-destructive" />,
          title: 'Error',
          description: message || 'An error occurred while loading this paste.',
        };
    }
  };

  const content = getContent();

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="flex flex-col items-center text-center space-y-6">
        <img
          src="/assets/generated/upload-illustration.dim_1200x600.png"
          alt="Error illustration"
          className="w-full max-w-md opacity-60"
        />
        <div className="space-y-2">
          {content.icon}
          <h2 className="text-2xl font-bold text-foreground mt-4">{content.title}</h2>
          <p className="text-muted-foreground max-w-md">{content.description}</p>
        </div>
      </div>
    </div>
  );
}
