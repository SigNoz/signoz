import { ENVIRONMENT } from 'constants/env';
import {
	meterFieldKeysResponse,
	otherFiltersFieldKeysResponse,
} from 'mocks-server/__mockdata__/customQuickFilters';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import '@testing-library/jest-dom';

import { SignalType } from '../../types';
import OtherFilters from '../OtherFilters';

const fieldsKeysURL = `${ENVIRONMENT.baseURL}/api/v1/fields/keys`;

const setAddedFilters = jest.fn();
let requests: URLSearchParams[] = [];

const setupServer = (): void => {
	server.use(
		rest.get(fieldsKeysURL, (req, res, ctx) => {
			requests.push(req.url.searchParams);
			const body =
				req.url.searchParams.get('source') === 'meter'
					? meterFieldKeysResponse
					: otherFiltersFieldKeysResponse;
			return res(ctx.status(200), ctx.json(body));
		}),
	);
};

const renderOtherFilters = (signal: SignalType | undefined): void => {
	render(
		<OtherFilters
			signal={signal}
			inputValue=""
			addedFilters={[]}
			setAddedFilters={setAddedFilters}
		/>,
	);
};

describe('OtherFilters field keys request', () => {
	beforeEach(() => {
		requests = [];
		setAddedFilters.mockClear();
		setupServer();
	});

	it('requests logs keys with the shared limit and no source', async () => {
		renderOtherFilters(SignalType.LOGS);

		await waitFor(() => expect(requests).toHaveLength(1));
		expect(requests[0].get('signal')).toBe('logs');
		expect(requests[0].get('limit')).toBe('100');
		expect(requests[0].has('source')).toBe(false);
		await expect(screen.findByText('service.name')).resolves.toBeInTheDocument();
	});

	it.each([
		[SignalType.TRACES],
		[SignalType.EXCEPTIONS],
		[SignalType.API_MONITORING],
	])('requests traces keys for the %s signal', async (signal) => {
		renderOtherFilters(signal);

		await waitFor(() => expect(requests).toHaveLength(1));
		expect(requests[0].get('signal')).toBe('traces');
	});

	it('scopes the meter signal to the metrics signal and the meter source', async () => {
		renderOtherFilters(SignalType.METER_EXPLORER);

		await waitFor(() => expect(requests).toHaveLength(1));
		expect(requests[0].get('signal')).toBe('metrics');
		expect(requests[0].get('source')).toBe('meter');
		expect(requests[0].get('limit')).toBe('100');
	});

	it('does not request keys without a signal', async () => {
		renderOtherFilters(undefined);

		await waitFor(() =>
			expect(screen.getByText(/OTHER FILTERS/i)).toBeInTheDocument(),
		);
		expect(requests).toHaveLength(0);
	});

	it('renders one row per context for a key that spans contexts', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderOtherFilters(SignalType.LOGS);

		const rows = await screen.findAllByText('host.name');
		expect(rows).toHaveLength(2);

		await user.click(
			rows[0].parentElement?.querySelector('button') as HTMLElement,
		);
		await user.click(
			rows[1].parentElement?.querySelector('button') as HTMLElement,
		);

		const added = setAddedFilters.mock.calls.map((call) => call[0]([])[0]);
		expect(added).toStrictEqual([
			{ key: 'host.name', dataType: 'string', type: 'resource' },
			{ key: 'host.name', dataType: 'string', type: 'tag' },
		]);
	});

	it('excludes an added filter only for its own context', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<OtherFilters
				signal={SignalType.LOGS}
				inputValue=""
				addedFilters={[{ key: 'host.name', dataType: 'string', type: 'resource' }]}
				setAddedFilters={setAddedFilters}
			/>,
		);

		const rows = await screen.findAllByText('host.name');
		expect(rows).toHaveLength(1);

		await user.click(
			rows[0].parentElement?.querySelector('button') as HTMLElement,
		);
		expect(setAddedFilters.mock.calls[0][0]([])).toStrictEqual([
			{ key: 'host.name', dataType: 'string', type: 'tag' },
		]);
	});

	it('keeps the raw meter context and narrows its number data type on add', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderOtherFilters(SignalType.METER_EXPLORER);

		const row = await screen.findByText('http.status_code');
		await user.click(row.parentElement?.querySelector('button') as HTMLElement);

		expect(setAddedFilters).toHaveBeenCalledTimes(1);
		const updater = setAddedFilters.mock.calls[0][0];
		expect(updater([])).toStrictEqual([
			{ key: 'http.status_code', dataType: 'float64', type: 'attribute' },
		]);
	});
});
