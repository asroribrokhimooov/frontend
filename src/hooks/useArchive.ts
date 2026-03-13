import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as archiveAPI from '../api/archive';
import type { ArchiveRestorePayload } from '../types';

const QUERY_KEY_ARCHIVE = ['archive'] as const;

export function useArchive() {
  return useQuery({
    queryKey: QUERY_KEY_ARCHIVE,
    queryFn: () => archiveAPI.getArchive(),
  });
}

export function useRestoreArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ArchiveRestorePayload) => archiveAPI.restoreArchive(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_ARCHIVE });
    },
  });
}
