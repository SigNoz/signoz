import { useCallback, useMemo } from 'react';
import { useQueries } from 'react-query';
import { isAxiosError } from 'axios';
import { authzCheck } from 'api/generated/services/authz';
import type {
	CoretypesObjectDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { IS_DEV, MODE } from 'lib/env';

import { AUTHZ_CACHE_TIME, SINGLE_FLIGHT_WAIT_TIME_MS } from './constants';
import type {
	AuthZCheckResponse,
	BrandedPermission,
	UseAuthZOptions,
	UseAuthZResult,
} from './types';
import {
	gettableTransactionToPermission,
	permissionToTransactionDto,
} from './utils';
import { OverrideState } from '../../devtools/types';

let devStoreRef:
	| typeof import('../../devtools/useAuthZDevStore').useAuthZDevStore
	| null = null;

if (IS_DEV) {
	void import('../../devtools/useAuthZDevStore').then((mod) => {
		devStoreRef = mod.useAuthZDevStore;
		return mod;
	});
}

const DEV_DELAY_MS = 2000;

function getDevOverride(permission: BrandedPermission): OverrideState | null {
	if (!IS_DEV || !devStoreRef) {
		return null;
	}
	return devStoreRef.getState().overrides[permission] ?? null;
}

async function applyDevOverrideToQuery(
	permission: BrandedPermission,
	fetchFn: () => Promise<AuthZCheckResponse>,
): Promise<AuthZCheckResponse> {
	const override = getDevOverride(permission);

	if (override === OverrideState.Error) {
		throw new Error(`[AuthZ DevTools] Simulated error for: ${permission}`);
	}

	if (override === OverrideState.Delay) {
		await new Promise((resolve) => setTimeout(resolve, DEV_DELAY_MS));
	}

	const response = await fetchFn();

	if (IS_DEV && devStoreRef) {
		const apiValue = response[permission]?.isGranted ?? false;
		devStoreRef.getState().registerObserved(permission, apiValue);
	}

	if (override === OverrideState.Granted) {
		return { [permission]: { isGranted: true } };
	}

	if (override === OverrideState.Denied) {
		return { [permission]: { isGranted: false } };
	}

	return response;
}

let ctx: Promise<AuthZCheckResponse> | null;
let pendingPermissions: BrandedPermission[] = [];

function dispatchPermission(
	permission: BrandedPermission,
): Promise<AuthZCheckResponse> {
	pendingPermissions.push(permission);

	if (!ctx) {
		let promiseResolve: (v: AuthZCheckResponse) => void,
			promiseReject: (reason?: unknown) => void;
		ctx = new Promise<AuthZCheckResponse>((resolve, reject) => {
			promiseResolve = resolve;
			promiseReject = reject;
		});

		setTimeout(() => {
			const copiedPermissions = [...pendingPermissions];
			pendingPermissions = [];
			ctx = null;

			fetchManyPermissions(copiedPermissions)
				.then(promiseResolve)
				.catch(promiseReject);
		}, SINGLE_FLIGHT_WAIT_TIME_MS);
	}

	return ctx;
}

async function fetchManyPermissions(
	permissions: BrandedPermission[],
): Promise<AuthZCheckResponse> {
	const payload: AuthtypesTransactionDTO[] = permissions.map((permission) => {
		const dto = permissionToTransactionDto(permission);
		const object: CoretypesObjectDTO = {
			resource: {
				kind: dto.object.resource.kind,
				type: dto.object.resource.type,
			},
			selector: dto.object.selector,
		};
		return { relation: dto.relation, object };
	});

	const { data } = await authzCheck(payload);

	const fromApi = (data ?? []).reduce<AuthZCheckResponse>((acc, item) => {
		const permission = gettableTransactionToPermission(item);
		acc[permission] = { isGranted: !!item.authorized };
		return acc;
	}, {} as AuthZCheckResponse);

	return permissions.reduce<AuthZCheckResponse>((acc, permission) => {
		acc[permission] = fromApi[permission] ?? { isGranted: false };
		return acc;
	}, {} as AuthZCheckResponse);
}

export function useAuthZ(
	permissions: BrandedPermission[],
	options?: UseAuthZOptions,
): UseAuthZResult {
	const { enabled } = options ?? { enabled: true };

	const queryResults = useQueries(
		permissions.map((permission) => {
			return {
				queryKey: ['authz', permission],
				cacheTime: AUTHZ_CACHE_TIME,
				staleTime: AUTHZ_CACHE_TIME,
				// Keep errored state in cache instead of refetching when new observers subscribe
				retryOnMount: false,
				// Only override retry in non-test mode to avoid interfering with test-utils QueryClient defaults
				...(MODE !== 'test' && {
					retry: (failureCount: number, error: unknown): boolean => {
						// Don't retry simulated dev errors - they will always fail
						if (
							error instanceof Error &&
							error.message.includes('[AuthZ DevTools]')
						) {
							return false;
						}
						// Don't retry server errors (5xx) - they won't recover
						if (
							isAxiosError(error) &&
							error.response?.status &&
							error.response.status >= 500
						) {
							return false;
						}
						return failureCount < 3;
					},
				}),
				refetchOnMount: false,
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: false,
				refetchOnReconnect: true,
				enabled,
				queryFn: async (): Promise<AuthZCheckResponse> => {
					const fetchFn = async (): Promise<AuthZCheckResponse> => {
						const response = await dispatchPermission(permission);
						return {
							[permission]: {
								isGranted: response[permission].isGranted,
							},
						};
					};

					if (IS_DEV) {
						return applyDevOverrideToQuery(permission, fetchFn);
					}

					return fetchFn();
				},
			};
		}),
	);

	const isLoading = useMemo(
		() => queryResults.some((q) => q.isLoading),
		[queryResults],
	);

	const isFetching = useMemo(
		() => queryResults.some((q) => q.isFetching),
		[queryResults],
	);

	const error = useMemo(
		() =>
			!isLoading
				? (queryResults.find((q) => !!q.error)?.error as Error) || null
				: null,
		[isLoading, queryResults],
	);
	const data = useMemo(() => {
		if (isLoading || error) {
			return null;
		}

		return queryResults.reduce((acc, q) => {
			if (!q.data) {
				return acc;
			}

			for (const [key, value] of Object.entries(q.data)) {
				acc[key as BrandedPermission] = value;
			}

			return acc;
		}, {} as AuthZCheckResponse);
	}, [isLoading, error, queryResults]);

	const refetchPermissions = useCallback(() => {
		for (const query of queryResults) {
			void query.refetch();
		}
	}, [queryResults]);

	const allowed = useMemo(() => {
		if (isLoading || error || !data) {
			return false;
		}
		return permissions.every((check) => data[check]?.isGranted === true);
	}, [permissions, data, isLoading, error]);

	const deniedPermissions = useMemo(() => {
		if (!data) {
			return [];
		}
		return permissions.filter((check) => data[check]?.isGranted !== true);
	}, [permissions, data]);

	return {
		isLoading,
		isFetching,
		error,
		permissions: data ?? null,
		allowed,
		deniedPermissions,
		refetchPermissions,
	};
}
