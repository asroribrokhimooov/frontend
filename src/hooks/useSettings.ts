import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { User, ProfileUpdatePayload } from '../types';

const QUERY_KEY_PROFILE = ['profile'] as const;

export function unwrapUser(raw: any): User | null {
    if (!raw) return null;
    if (raw.first_name !== undefined || raw.email !== undefined) return raw;
    if (raw.data && (raw.data.first_name !== undefined || raw.data.email !== undefined)) return raw.data;
    return raw;
}

export function useProfile() {
    return useQuery({
        queryKey: QUERY_KEY_PROFILE,
        queryFn: async (): Promise<User | null> => {
            const res = await api.get<User>('/settings/profile');
            return unwrapUser(res.data);
        },
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ProfileUpdatePayload & { language?: string; theme?: string }) => {
            const res = await api.patch<User>('/settings/profile', payload);
            return unwrapUser(res.data) as User;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY_PROFILE });
        },
    });
}

export function useSetAppLock() {
    return useMutation({
        mutationFn: async (payload: { code: string }) => {
            const res = await api.patch('/settings/app-lock', payload);
            return res.data;
        },
    });
}

export function useVerifyAppLock() {
    return useMutation({
        mutationFn: async (payload: { code: string }) => {
            const res = await api.post('/settings/app-lock/verify', payload);
            return res.data;
        },
    });
}

export function useRemoveAppLock() {
    return useMutation({
        mutationFn: async () => {
            const res = await api.delete('/settings/app-lock');
            return res.data;
        },
    });
}
