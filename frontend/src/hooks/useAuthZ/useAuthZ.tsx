import { useMemo } from 'react';
import { useQueries } from 'react-query';
import api from 'api';

import { BrandedPermission } from './utils';

export type UseAuthZPermissionResult = {
	isGranted: boolean;
};

export type AuthZCheckResponse = Record<
	BrandedPermission,
	UseAuthZPermissionResult
>;

export type UseAuthZResult = {
	isLoading: boolean;
	error: Error | null;
	permissions: AuthZCheckResponse | null;
};

let ctx: Promise<AuthZCheckResponse> | null;
let pendingPermissions: BrandedPermission[] = [];
const SINGLE_FLIGHT_WAIT_TIME_MS = 50;
const AUTHZ_CACHE_TIME = 20_000;

function dispatchPermission(
	permission: BrandedPermission,
): Promise<AuthZCheckResponse> {
	pendingPermissions.push(permission);

	if (!ctx) {
		let resolve: (v: AuthZCheckResponse) => void, reject: (reason?: any) => void;
		ctx = new Promise<AuthZCheckResponse>((r, re) => {
			resolve = r;
			reject = re;
		});

		setTimeout(() => {
			const copiedPermissions = pendingPermissions.slice();
			pendingPermissions = [];
			ctx = null;

			fetchManyPermissions(copiedPermissions).then(resolve).catch(reject);
		}, SINGLE_FLIGHT_WAIT_TIME_MS);
	}

	return ctx;
}

async function fetchManyPermissions(
	permissions: BrandedPermission[],
): Promise<AuthZCheckResponse> {
	const permissionsPayload = permissions.map((permission) => {
		const [relation, object] = permission.split('/');

		return {
			relation,
			object,
		};
	});

	const permissionsCheckResponse = await api
		.post<Record<string, boolean>>('/permissions/check', {
			permissions: permissionsPayload,
		})
		.then((response) => response.data);

	return Object.keys(permissionsCheckResponse).reduce<AuthZCheckResponse>(
		(acc, permission): AuthZCheckResponse => {
			acc[permission as BrandedPermission] = {
				isGranted: !!permissionsCheckResponse[permission],
			};
			return acc;
		},
		{} as AuthZCheckResponse,
	);
}

export function useAuthZ(permissions: BrandedPermission[]): UseAuthZResult {
	const queryResults = useQueries(
		permissions.map((permission) => {
			return {
				queryKey: ['authz', permission],
				cacheTime: AUTHZ_CACHE_TIME,
				refetchOnMount: false,
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: false,
				refetchOnReconnect: true,
				queryFn: async (): Promise<AuthZCheckResponse> => {
					const response = await dispatchPermission(permission);

					return {
						[permission]: {
							isGranted: response[permission].isGranted,
						},
					};
				},
			};
		}),
	);

	const isLoading = useMemo(() => queryResults.some((q) => q.isLoading), [
		queryResults,
	]);
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

	return {
		isLoading,
		error,
		permissions: data ?? null,
	};
}
