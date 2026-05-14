import type {
	AuthtypesGettableTransactionDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
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
