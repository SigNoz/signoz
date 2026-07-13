import type { BrandedPermission } from '../hooks/useAuthZ/types';

export enum OverrideState {
	Granted = 'granted',
	Denied = 'denied',
	Delay = 'delay',
	Error = 'error',
	Reset = 'reset',
}

export type ObservedPermission = {
	permission: BrandedPermission;
	apiValue: boolean | null;
	lastSeen: number;
};

export type PermissionOverride = {
	permission: BrandedPermission;
	state: OverrideState;
};

export type AuthZDevStore = {
	isModalOpen: boolean;
	observed: Record<string, ObservedPermission>;
	overrides: Record<string, OverrideState>;

	openModal: () => void;
	closeModal: () => void;
	toggleModal: () => void;

	registerObserved: (permission: BrandedPermission, apiValue: boolean) => void;
	setOverride: (permission: BrandedPermission, state: OverrideState) => void;
	clearOverride: (permission: BrandedPermission) => void;
	clearAllOverrides: (permissions?: BrandedPermission[]) => void;
	grantAll: (permissions?: BrandedPermission[]) => void;
	denyAll: (permissions?: BrandedPermission[]) => void;
	cycleOverride: (permission: BrandedPermission) => void;
};

export const OVERRIDE_CYCLE: OverrideState[] = [
	OverrideState.Reset,
	OverrideState.Granted,
	OverrideState.Denied,
	OverrideState.Delay,
	OverrideState.Error,
];
