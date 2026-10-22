import { screen, waitFor } from '@testing-library/react';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render } from 'tests/test-utils';

import { SignalType } from '../../types';
import OtherFilters from '../OtherFilters';

const BASE_URL = ENVIRONMENT.baseURL;
const FIELDS_KEYS_URL = `${BASE_URL}/api/v1/fields/keys`;
const AI_KEYS_URL = `${BASE_URL}/api/v1/ai_observability/fields/keys`;

function keysResponse(name: string): Record<string, unknown> {
	return {
		status: 'success',
		data: {
			complete: true,
			keys: {
				[name]: [{ name, fieldContext: 'attribute', fieldDataType: 'string' }],
			},
		},
	};
}

describe('OtherFilters - AI observability keys', () => {
	let fieldsKeysCalled: boolean;
	let aiKeysParams: URLSearchParams | undefined;

	beforeEach(() => {
		fieldsKeysCalled = false;
		aiKeysParams = undefined;

		server.use(
			rest.get(FIELDS_KEYS_URL, (_, res, ctx) => {
				fieldsKeysCalled = true;
				return res(ctx.status(200), ctx.json(keysResponse('http.route')));
			}),
			rest.get(AI_KEYS_URL, (req, res, ctx) => {
				aiKeysParams = req.url.searchParams;
				return res(ctx.status(200), ctx.json(keysResponse('gen_ai.request.model')));
			}),
		);
	});

	function renderOtherFilters(signal: SignalType): void {
		render(
			<OtherFilters
				signal={signal}
				inputValue=""
				addedFilters={[]}
				setAddedFilters={jest.fn()}
			/>,
		);
	}

	it('reads AI observability keys from their own endpoint', async () => {
		renderOtherFilters(SignalType.AI_OBSERVABILITY);

		await expect(
			screen.findByText('gen_ai.request.model'),
		).resolves.toBeInTheDocument();
		expect(fieldsKeysCalled).toBe(false);
	});

	it('does not narrow the AI keys by fieldContext', async () => {
		renderOtherFilters(SignalType.AI_OBSERVABILITY);

		// A `trace` context would return only the computed per-trace aggregates,
		// which cannot be filtered on.
		await waitFor(() => expect(aiKeysParams).toBeDefined());
		expect(aiKeysParams?.get('fieldContext')).toBeNull();
	});

	it('keeps other signals on the signal-wide keys endpoint', async () => {
		renderOtherFilters(SignalType.TRACES);

		await expect(screen.findByText('http.route')).resolves.toBeInTheDocument();
		await waitFor(() => expect(aiKeysParams).toBeUndefined());
	});
});
