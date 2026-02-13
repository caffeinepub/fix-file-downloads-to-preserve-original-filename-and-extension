import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { ExternalBlob, type PasteChunk, type PasteChunkType } from '../backend';

export function useCreatePaste() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      message,
      files,
      expirationType,
    }: {
      message: string;
      files: File[];
      expirationType: string;
    }) => {
      if (!actor) throw new Error('Actor not available');

      const chunks: PasteChunk[] = [];

      // Add text message if provided
      if (message.trim()) {
        chunks.push({
          __kind__: 'text',
          text: message.trim(),
        });
      }

      // Add files with original filename and MIME type
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const blob = ExternalBlob.fromBytes(uint8Array);
        
        // Save file to backend with original filename and content type
        const savedFileChunk = await actor.saveFile(
          blob,
          file.name,
          file.type || null
        );
        
        chunks.push({
          __kind__: 'file',
          file: savedFileChunk,
        });
      }

      // Create paste
      const pasteId = await actor.createPaste(chunks, expirationType);
      return pasteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastes'] });
    },
  });
}

export function useGetPaste(pasteId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['paste', pasteId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');

      const chunksWithTypes = await actor.getPasteChunksWithTypes(pasteId);
      const remainingTime = await actor.getRemainingTime(pasteId);

      const chunks = chunksWithTypes.map(([chunk, type]) => {
        if (type === 'text' && chunk.__kind__ === 'text') {
          return {
            type: 'text' as const,
            content: chunk.text,
          };
        } else if (type === 'file' && chunk.__kind__ === 'file') {
          return {
            type: 'file' as const,
            blob: chunk.file.data,
            filename: chunk.file.filename,
            contentType: chunk.file.contentType,
          };
        }
        throw new Error('Invalid chunk type');
      });

      return { chunks, remainingTime };
    },
    enabled: !!actor && !actorFetching && !!pasteId,
    retry: false,
  });
}
