import { useGetPasteHistory, useGetRemainingTime } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, FileText, Edit2, ExternalLink, History, AlertCircle } from 'lucide-react';
import { formatRemainingTime } from '../utils/formatRemainingTime';
import ErrorState from '../components/ErrorState';
import { useState } from 'react';
import PasteEditModal from '../components/PasteEditModal';

export default function HistoryPage() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: pasteHistory, isLoading, error, refetch } = useGetPasteHistory();
  const [editingPasteId, setEditingPasteId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState
          type="error"
          details="Please login to view your paste history"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="app-card">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState
          type="error"
          onRetry={() => refetch()}
          details={error.message}
          retryLabel="Retry Loading History"
        />
      </div>
    );
  }

  if (!pasteHistory || pasteHistory.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="app-card">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <History className="h-6 w-6" />
              Paste History
            </CardTitle>
            <CardDescription>View and manage all your pastes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No pastes yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first paste to see it here
              </p>
              <Button onClick={() => window.location.hash = '/'}>
                Create Paste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="app-card">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <History className="h-6 w-6" />
            Paste History
          </CardTitle>
          <CardDescription>
            View and manage all your pastes ({pasteHistory.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pasteHistory.map(([pasteId, paste]) => (
            <PasteHistoryItem
              key={pasteId}
              pasteId={pasteId}
              paste={paste}
              onEdit={() => setEditingPasteId(pasteId)}
            />
          ))}
        </CardContent>
      </Card>

      {editingPasteId && (
        <PasteEditModal
          pasteId={editingPasteId}
          onClose={() => setEditingPasteId(null)}
          onSuccess={() => {
            setEditingPasteId(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

interface PasteHistoryItemProps {
  pasteId: string;
  paste: any;
  onEdit: () => void;
}

function PasteHistoryItem({ pasteId, paste, onEdit }: PasteHistoryItemProps) {
  const { data: remainingTimeNs } = useGetRemainingTime(pasteId);
  
  const isExpired = remainingTimeNs !== undefined && remainingTimeNs <= 0n;
  const remainingTime = remainingTimeNs ? formatRemainingTime(remainingTimeNs) : 'Loading...';

  const textChunks = paste.items.filter((item: any) => item.__kind__ === 'text');
  const fileChunks = paste.items.filter((item: any) => item.__kind__ === 'file');
  
  const textPreview = textChunks.length > 0 
    ? textChunks[0].text.substring(0, 100) + (textChunks[0].text.length > 100 ? '...' : '')
    : null;

  const handleViewPaste = () => {
    window.location.hash = `/${pasteId}`;
  };

  return (
    <div className={`p-4 border rounded-lg ${isExpired ? 'bg-muted/50 opacity-75' : 'bg-card'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-3 flex-1 min-w-0">
          {/* Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {isExpired ? (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                EXPIRED
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {remainingTime}
              </Badge>
            )}
            {paste.password && (
              <Badge variant="outline" className="text-xs">
                Password Protected
              </Badge>
            )}
          </div>

          {/* Text Preview */}
          {textPreview && (
            <div className="text-sm text-muted-foreground">
              <p className="font-mono break-words">{textPreview}</p>
            </div>
          )}

          {/* File List */}
          {fileChunks.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {fileChunks.length} file{fileChunks.length > 1 ? 's' : ''}: {fileChunks.map((f: any) => f.file.filename).join(', ')}
              </span>
            </div>
          )}

          {/* Paste ID */}
          <div className="text-xs text-muted-foreground font-mono">
            ID: {pasteId}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0">
          {!isExpired && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant={isExpired ? 'outline' : 'default'}
            onClick={handleViewPaste}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
