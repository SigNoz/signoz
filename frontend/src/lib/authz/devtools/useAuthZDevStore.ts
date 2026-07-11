import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { BrandedPermission } from '../hooks/useAuthZ/types';
import { OverrideState, OVERRIDE_CYCLE, type AuthZDevStore } from './types';
import { getScopedKey } from 'utils/storage';

export const useAuthZDevStore = create<AuthZDevStore>()(
	persist(
		(set, get) => ({
			isModalOpen: false,
			observed: {},
			overrides: {},

			openModal: (): void => {
				set({ isModalOpen: true });
			},

			closeModal: (): void => {
				set({ isModalOpen: false });
			},

			toggleModal: (): void => {
				set((state) => ({ isModalOpen: !state.isModalOpen }));
			},

			registerObserved: (
				permission: BrandedPermission,
				apiValue: boolean,
			): void => {
				set((state) => ({
					observed: {
						...state.observed,
						[permission]: {
							permission,
							apiValue,
							lastSeen: Date.now(),
						},
					},
				}));
			},

			setOverride: (permission: BrandedPermission, state: OverrideState): void => {
				if (state === OverrideState.Reset) {
					get().clearOverride(permission);
					return;
				}
				set((s) => ({
					overrides: {
						...s.overrides,
						[permission]: state,
					},
				}));
			},

			clearOverride: (permission: BrandedPermission): void => {
				set((state) => {
					const { [permission]: _, ...rest } = state.overrides;
					return { overrides: rest };
				});
			},

			clearAllOverrides: (permissions?: BrandedPermission[]): void => {
				if (permissions) {
					set((state) => {
						const newOverrides = { ...state.overrides };
						for (const permission of permissions) {
							delete newOverrides[permission];
						}
						return { overrides: newOverrides };
					});
				} else {
					set({ overrides: {} });
				}
			},

			grantAll: (permissions?: BrandedPermission[]): void => {
				set((state) => {
					const keys = permissions ?? Object.keys(state.observed);
					const newOverrides: Record<string, OverrideState> = {
						...state.overrides,
					};
					for (const key of keys) {
						newOverrides[key] = OverrideState.Granted;
					}
					return { overrides: newOverrides };
				});
			},

			denyAll: (permissions?: BrandedPermission[]): void => {
				set((state) => {
					const keys = permissions ?? Object.keys(state.observed);
					const newOverrides: Record<string, OverrideState> = {
						...state.overrides,
					};
					for (const key of keys) {
						newOverrides[key] = OverrideState.Denied;
					}
					return { overrides: newOverrides };
				});
			},

			cycleOverride: (permission: BrandedPermission): void => {
				const currentOverride = get().overrides[permission] ?? OverrideState.Reset;
				const currentIndex = OVERRIDE_CYCLE.indexOf(currentOverride);
				const nextIndex = (currentIndex + 1) % OVERRIDE_CYCLE.length;
				const nextState = OVERRIDE_CYCLE[nextIndex];
				get().setOverride(permission, nextState);
			},
		}),
		{
			name: `@signoz/${getScopedKey('authz-dev-overrides')}`,
			partialize: (state) => {
				// Clear apiValue for permissions without active override (auto mode)
				// since the API value can change between sessions
				const observed: typeof state.observed = {};
				for (const [key, obs] of Object.entries(state.observed)) {
					observed[key] = {
						...obs,
						apiValue: key in state.overrides ? obs.apiValue : null,
					};
				}
				return {
					observed,
					overrides: state.overrides,
				};
			},
		},
	),
);

export const openAuthZDevModal = (): void =>
	useAuthZDevStore.getState().openModal();
export const closeAuthZDevModal = (): void =>
	useAuthZDevStore.getState().closeModal();
export const toggleAuthZDevModal = (): void =>
	useAuthZDevStore.getState().toggleModal();
