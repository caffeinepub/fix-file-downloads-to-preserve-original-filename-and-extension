import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, FileCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UploadProgressStatusProps {
  currentFile: number;
  totalFiles: number;
  filename: string;
  percentage: number;
  stage: 'preparing' | 'uploading' | 'creating';
}

export default function UploadProgressStatus({
  currentFile,
  totalFiles,
  filename,
  percentage,
  stage,
}: UploadProgressStatusProps) {
  if (stage === 'creating') {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Creating paste...</p>
              <p className="text-xs text-muted-foreground">Finalizing your content</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stage === 'preparing') {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-primary animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Preparing file {currentFile} of {totalFiles}
              </p>
              <p className="text-xs text-muted-foreground truncate">{filename}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              Uploading file {currentFile} of {totalFiles}
            </p>
            <p className="text-xs text-muted-foreground truncate">{filename}</p>
          </div>
          <span className="text-sm font-medium text-primary shrink-0">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </CardContent>
    </Card>
  );
}
