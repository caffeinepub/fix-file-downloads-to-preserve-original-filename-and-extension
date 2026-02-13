import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useCreatePaste } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Copy, Check, ExternalLink, Loader2, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../config/pasteLimits';

export default function CreatePastePage() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [expirationType, setExpirationType] = useState('24hours');
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const createPasteMutation = useCreatePaste();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError('');

    // Validate file sizes
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      setError(
        `The following files exceed the ${MAX_FILE_SIZE_MB}MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`
      );
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!message.trim() && files.length === 0) {
      setError('Please add a message or upload at least one file.');
      return;
    }

    try {
      const pasteId = await createPasteMutation.mutateAsync({
        message: message.trim(),
        files,
        expirationType,
      });

      const url = `${window.location.origin}${window.location.pathname}#/p/${pasteId}`;
      setShareUrl(url);
      toast.success('Paste created successfully!');

      // Reset form
      setMessage('');
      setFiles([]);
      setExpirationType('24hours');
    } catch (err: any) {
      setError(err.message || 'Failed to create paste. Please try again.');
      toast.error('Failed to create paste');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenPaste = () => {
    window.location.hash = shareUrl.split('#')[1];
  };

  const handleCreateAnother = () => {
    setShareUrl('');
    setCopied(false);
  };

  if (shareUrl) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Paste Created Successfully! 🎉</CardTitle>
            <CardDescription>Share this link with anyone to give them access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg break-all font-mono text-sm">
              {shareUrl}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1 gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button onClick={handleOpenPaste} variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open
              </Button>
            </div>
            <Button onClick={handleCreateAnother} variant="secondary" className="w-full">
              Create Another Paste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create a New Paste</CardTitle>
            <CardDescription>Share files and messages securely with auto-expiration</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription className="text-center py-4">
                Please log in to create a paste. Anyone with the link will be able to view it without logging in.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a New Paste</CardTitle>
          <CardDescription>Share files and messages securely with auto-expiration</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="files">Files (optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="files"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="files" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload files (max {MAX_FILE_SIZE_MB}MB per file)
                  </p>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration">Expiration</Label>
              <Select value={expirationType} onValueChange={setExpirationType}>
                <SelectTrigger id="expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">24 Hours</SelectItem>
                  <SelectItem value="7days">7 Days</SelectItem>
                  <SelectItem value="30days">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createPasteMutation.isPending}
            >
              {createPasteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Paste'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
