import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface UploadProgressStatusProps {
  currentFile: number;
  totalFiles: number;
  filename: string;
  percentage: number;
}

export default function UploadProgressStatus({
  currentFile,
  totalFiles,
  filename,
  percentage,
}: UploadProgressStatusProps) {
  return (
    <div className="p-4 bg-muted rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Uploading file {currentFile} of {totalFiles}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {filename}
          </p>
        </div>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground text-right">
        {percentage}%
      </p>
    </div>
  );
}
