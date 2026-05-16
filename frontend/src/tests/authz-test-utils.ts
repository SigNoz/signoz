import type {
	AuthtypesGettableTransactionDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
import { gettableTransactionToPermission } from 'hooks/useAuthZ/utils';
import type {
	BrandedPermission,
	UseAuthZOptions,
	UseAuthZResult,
} from 'hooks/useAuthZ/types';
import { rest } from 'msw';
import type { RestHandler } from 'msw';

export const AUTHZ_CHECK_URL = `${ENVIRONMENT.baseURL || ''}/api/v1/authz/check`;

export function authzMockResponse(
	payload: AuthtypesTransactionDTO[],
	authorizedByIndex: boolean[],
): { data: AuthtypesGettableTransactionDTO[]; status: string } {
	return {
		data: payload.map((txn, i) => ({
			relation: txn.relation,
			object: txn.object,
			authorized: authorizedByIndex[i] ?? false,
		})),
		status: 'success',
	};
}

export function setupAuthzAdmin(): RestHandler {
	return rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
		const payload = (await req.json()) as AuthtypesTransactionDTO[];
		return res(
			ctx.status(200),
			ctx.json(
				authzMockResponse(
					payload,
					payload.map(() => true),
				),
			),
		);
	});
}

/** Denies all permission checks. */
export function setupAuthzDenyAll(): RestHandler {
	return rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
		const payload = (await req.json()) as AuthtypesTransactionDTO[];
		return res(
			ctx.status(200),
			ctx.json(
				authzMockResponse(
					payload,
					payload.map(() => false),
				),
			),
		);
	});
}

/** Grants all permissions except the ones listed — matched precisely by relation + object. */
export function setupAuthzDeny(
	...permissions: BrandedPermission[]
): RestHandler {
	const denied = new Set<BrandedPermission>(permissions);
	return rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
		const payload = (await req.json()) as AuthtypesTransactionDTO[];
		return res(
			ctx.status(200),
			ctx.json(
				authzMockResponse(
					payload,
					payload.map((txn) => !denied.has(gettableTransactionToPermission(txn))),
				),
			),
		);
	});
}

/** Denies all permissions except the ones listed — matched precisely by relation + object. */
export function setupAuthzAllow(
	...permissions: BrandedPermission[]
): RestHandler {
	const allowed = new Set<BrandedPermission>(permissions);
	return rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
		const payload = (await req.json()) as AuthtypesTransactionDTO[];
		return res(
			ctx.status(200),
			ctx.json(
				authzMockResponse(
					payload,
					payload.map((txn) => allowed.has(gettableTransactionToPermission(txn))),
				),
			),
		);
	});
}

export function mockUseAuthZGrantAll(
	permissions: BrandedPermission[],
	_options?: UseAuthZOptions,
): UseAuthZResult {
	return {
		isLoading: false,
		isFetching: false,
		error: null,
		permissions: Object.fromEntries(
			permissions.map((p) => [p, { isGranted: true }]),
		) as UseAuthZResult['permissions'],
		refetchPermissions: jest.fn(),
	};
}

export function mockUseAuthZDenyAll(
	permissions: BrandedPermission[],
	_options?: UseAuthZOptions,
): UseAuthZResult {
	return {
		isLoading: false,
		isFetching: false,
		error: null,
		permissions: Object.fromEntries(
			permissions.map((p) => [p, { isGranted: false }]),
		) as UseAuthZResult['permissions'],
		refetchPermissions: jest.fn(),
	};
}
