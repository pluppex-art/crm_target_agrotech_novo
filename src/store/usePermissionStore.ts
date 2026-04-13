import { create } from 'zustand';
import { PERMISSIONS } from '../types/permissions';

const ROLES = [
  { id: 'admin', name: 'Admin', isAdmin: true },
  { id: 'manager', name: 'Gerente', isAdmin: false },
  { id: 'consultor', name: 'Consultor', isAdmin: false },
];

type RolePermission = {
  role: string;
  permissions: string[];
};



interface PermissionState {
  rolePermissions: RolePermission[];
  updateRolePermission: (role: string, permissionId: string, enabled: boolean) => void;
  resetToDefaults: () => void;
}

const INITIAL_PERMISSIONS: RolePermission[] = ROLES.map(role => ({
  role: role.id,
  permissions: role.isAdmin ? Array.from(PERMISSIONS) : []
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
