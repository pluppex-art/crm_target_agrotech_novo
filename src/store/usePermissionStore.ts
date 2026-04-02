import { create } from 'zustand';
import { Role, RolePermission, ROLES, PERMISSIONS } from '../types/permissions';

interface PermissionState {
  rolePermissions: RolePermission[];
  updateRolePermission: (role: Role, permissionId: string, enabled: boolean) => void;
  resetToDefaults: () => void;
}

const INITIAL_PERMISSIONS: RolePermission[] = ROLES.map(role => ({
  role: role.id,
  permissions: role.isAdmin ? PERMISSIONS.map(p => p.id) : []
}));

export const usePermissionStore = create<PermissionState>((set) => ({
  rolePermissions: INITIAL_PERMISSIONS,
  updateRolePermission: (role, permissionId, enabled) => set((state) => {
    // Admins are locked to all permissions
    const roleInfo = ROLES.find(r => r.id === role);
    if (roleInfo?.isAdmin) return state;

    return {
      rolePermissions: state.rolePermissions.map((rp) => {
        if (rp.role === role) {
          const newPermissions = enabled
            ? [...rp.permissions, permissionId]
            : rp.permissions.filter((id) => id !== permissionId);
          return { ...rp, permissions: newPermissions };
        }
        return rp;
      }),
    };
  }),
  resetToDefaults: () => set({ rolePermissions: INITIAL_PERMISSIONS }),
}));
