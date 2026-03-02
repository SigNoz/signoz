import { useMemo } from 'react';
import { useQueries } from 'react-query';
import { authzCheck } from 'api/generated/services/authz';
import type {
	AuthtypesObjectDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';

import { AuthZCheckResponse, BrandedPermission, UseAuthZResult } from './types';
import {
	gettableTransactionToPermission,
	permissionToTransactionDto,
} from './utils';

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
	const payload: AuthtypesTransactionDTO[] = permissions.map((permission) => {
		const dto = permissionToTransactionDto(permission);
		const object: AuthtypesObjectDTO = {
			resource: {
				name: dto.object.resource.name,
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
