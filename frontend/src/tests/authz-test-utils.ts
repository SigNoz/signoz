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
import {
	LicenseEvent,
	LicensePlatform,
	type LicenseResModel,
	LicenseState,
	LicenseStatus,
} from 'types/api/licensesV3/getActive';

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

export function buildLicense(
	overrides?: Partial<LicenseResModel>,
): LicenseResModel {
	return {
		key: 'test-key',
		status: LicenseStatus.VALID,
		state: LicenseState.ACTIVATED,
		platform: LicensePlatform.CLOUD,
		event_queue: {
			created_at: '0',
			event: LicenseEvent.NO_EVENT,
			scheduled_at: '0',
			status: '',
			updated_at: '0',
		},
		plan: {
			created_at: '0',
			description: '',
			is_active: true,
			name: '',
			updated_at: '0',
		},
		plan_id: '0',
		free_until: '0',
		updated_at: '0',
		valid_from: 0,
		valid_until: 0,
		created_at: '0',
		...overrides,
	};
}

export const invalidLicense = buildLicense({ status: LicenseStatus.INVALID });

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
