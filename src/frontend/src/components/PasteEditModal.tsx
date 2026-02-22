import { useState, useEffect } from 'react';
import { useGetPaste, useEditPaste, useExtendExpiration, useGetPassword } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, FileText, X, Upload, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../config/pasteLimits';
import type { PasteChunk, FileChunk } from '../backend';
import { ExternalBlob } from '../backend';
import { useActor } from '../hooks/useActor';

interface PasteEditModalProps {
  pasteId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasteEditModal({ pasteId, onClose, onSuccess }: PasteEditModalProps) {
  const { actor } = useActor();
  const { data: paste, isLoading: pasteLoading } = useGetPaste(pasteId);
  const { data: currentPassword } = useGetPassword(pasteId);
  const editPasteMutation = useEditPaste();
  const extendExpirationMutation = useExtendExpiration();

  const [editedText, setEditedText] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expirationType, setExpirationType] = useState('24hours');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (paste) {
      const textChunks = paste.items.filter(item => item.__kind__ === 'text');
      const textContent = textChunks.map(item => item.text).join('\n\n');
      setEditedText(textContent);
    }
  }, [paste]);

  useEffect(() => {
    if (currentPassword) {
      setPassword(currentPassword);
    }
  }, [currentPassword]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed the ${MAX_FILE_SIZE_MB}MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setNewFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!paste || !actor) return;

    try {
      // Keep existing file chunks
      const existingFileChunks = paste.items.filter(item => item.__kind__ === 'file');
      
      // Upload new files
      const newFileChunks: PasteChunk[] = [];
      if (newFiles.length > 0) {
        setUploadProgress({ current: 0, total: newFiles.length });
        
        for (let i = 0; i < newFiles.length; i++) {
          const file = newFiles[i];
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
            console.log(`Uploading ${file.name}: ${percentage}%`);
          });

          const fileChunk = await actor.saveFile(blob, file.name, file.type || null);
          
          newFileChunks.push({
            __kind__: 'file',
            file: fileChunk,
          });
          
          setUploadProgress({ current: i + 1, total: newFiles.length });
        }
      }

      // Build new chunks array
      const newChunks: PasteChunk[] = [];

      // Add text if present
      if (editedText.trim()) {
        newChunks.push({
          __kind__: 'text',
          text: editedText.trim(),
        });
      }

      // Add existing files
      newChunks.push(...existingFileChunks);

      // Add new files
      newChunks.push(...newFileChunks);

      // Update paste
      await editPasteMutation.mutateAsync({
        pasteId,
        newChunks,
      });

      // Extend expiration
      await extendExpirationMutation.mutateAsync({
        pasteId,
        newExpirationType: expirationType,
      });

      toast.success('Paste updated successfully');
      onSuccess();
    } catch (err: any) {
      console.error('Edit error:', err);
      toast.error(err.message || 'Failed to update paste');
    } finally {
      setUploadProgress(null);
    }
  };

  const isSaving = editPasteMutation.isPending || extendExpirationMutation.isPending;

  if (pasteLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!paste) {
    return null;
  }

  const existingFileChunks = paste.items.filter(item => item.__kind__ === 'file');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Paste</DialogTitle>
          <DialogDescription>
            Update text, add files, extend expiration, or change password
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Text Content */}
          <div className="space-y-2">
            <Label htmlFor="edit-text">Message</Label>
            <Textarea
              id="edit-text"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Enter your message..."
              disabled={isSaving}
            />
          </div>

          {/* Existing Files */}
          {existingFileChunks.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Files ({existingFileChunks.length})</Label>
              <div className="space-y-2">
                {existingFileChunks.map((chunk, index) => {
                  const fileChunk = chunk.file;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{fileChunk.filename}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add New Files */}
          <div className="space-y-2">
            <Label htmlFor="new-files">Add New Files (Optional, {MAX_FILE_SIZE_MB}MB per file)</Label>
            <Input
              id="new-files"
              type="file"
              onChange={handleFileChange}
              disabled={isSaving}
              multiple
              className="cursor-pointer"
            />
            {newFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                {newFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNewFile(index)}
                      disabled={isSaving}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="edit-password">Password (Optional)</Label>
            <div className="relative">
              <Input
                id="edit-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to protect this paste"
                disabled={isSaving}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-3"
                disabled={isSaving}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="edit-expiration">Extend Expiration To</Label>
            <Select
              value={expirationType}
              onValueChange={setExpirationType}
              disabled={isSaving}
            >
              <SelectTrigger id="edit-expiration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10min">10 minutes</SelectItem>
                <SelectItem value="24hours">24 hours</SelectItem>
                <SelectItem value="7days">7 days</SelectItem>
                <SelectItem value="30days">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Uploading file {uploadProgress.current} of {uploadProgress.total}...
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
