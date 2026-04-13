import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useCargoStore } from '../store/useCargoStore';
import { useProfileStore } from '../store/useProfileStore';
import { profileService } from '../services/profileService';

export const usePermissions = () => {
  const { user } = useAuthStore();
  // cargos is reactive — updates immediately when admin changes permissions
  const { cargos } = useCargoStore();
  // profiles is reactive via realtime — updates when user's role_id changes
  const { profiles } = useProfileStore();
  const [roleId, setRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  // Initial DB fetch to get the user's roleId
  const loadRoleId = async () => {
    if (!user?.id) {
      setRoleId(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const profile = await profileService.getProfile(user.id);
      setRoleId(profile?.role_id ?? null);
    } catch (err) {
      console.error('Error loading role:', err);
      setRoleId(null);
    } finally {
      setLoading(false);
    }
  };

  // Reset and re-fetch when user changes (login/logout)
  useEffect(() => {
    hasFetched.current = false;
    setLoading(true);
  }, [user?.id]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadRoleId();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep roleId in sync when profiles store gets a realtime update
  // (e.g., admin changed this user's cargo in Users page)
  useEffect(() => {
    if (!user?.id || profiles.length === 0) return;
    const myProfile = profiles.find(p => p.id === user.id);
    if (myProfile && myProfile.role_id !== undefined && myProfile.role_id !== roleId) {
      setRoleId(myProfile.role_id ?? null);
    }
  }, [profiles, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Permissions are derived reactively — updates the moment cargos change in the store
  const permissions = useMemo(() => {
    if (!roleId) return [];
    const cargo = cargos.find(c => c.id === roleId);
    return cargo?.permissions ?? [];
  }, [roleId, cargos]);

  const hasPermission = (permission: string): boolean =>
    permissions.includes(permission) || permissions.includes('admin.all');

  return { permissions, hasPermission, loading, reload: loadRoleId };
};
