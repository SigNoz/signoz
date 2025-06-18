import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import TimezoneProvider from 'providers/Timezone';
import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

import * as appContextHooks from '../../../providers/App/App';
import { LicenseEvent } from '../../../types/api/licensesV3/getActive';
import AllErrors from '../index';
import {
	INIT_URL_WITH_COMMON_QUERY,
	MOCK_ERROR_LIST,
	TAG_FROM_QUERY,
} from './constants';

jest.mock('hooks/useResourceAttribute', () =>
	jest.fn(() => ({
		queries: [],
	})),
);

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: jest.fn(),
}));

jest.spyOn(appContextHooks, 'useAppContext').mockReturnValue({
	user: {
		role: 'admin',
	},
	activeLicenseV3: {
		event_queue: {
			created_at: '0',
			event: LicenseEvent.NO_EVENT,
			scheduled_at: '0',
			status: '',
			updated_at: '0',
		},
		license: {
			license_key: 'test-license-key',
			license_type: 'trial',
			org_id: 'test-org-id',
			plan_id: 'test-plan-id',
			plan_name: 'test-plan-name',
			plan_type: 'trial',
			plan_version: 'test-plan-version',
		},
	},
} as any);

function Exceptions({ initUrl }: { initUrl?: string[] }): JSX.Element {
	return (
		<MemoryRouter initialEntries={initUrl ?? ['/exceptions']}>
			<TimezoneProvider>
				<Provider store={store}>
					<MockQueryClientProvider>
						<AllErrors />
					</MockQueryClientProvider>
				</Provider>
			</TimezoneProvider>
		</MemoryRouter>
	);
}

Exceptions.defaultProps = {
	initUrl: ['/exceptions'],
};

const BASE_URL = ENVIRONMENT.baseURL;
const listErrorsURL = `${BASE_URL}/api/v1/listErrors`;
const countErrorsURL = `${BASE_URL}/api/v1/countErrors`;

const postListErrorsSpy = jest.fn();

describe('Exceptions - All Errors', () => {
	beforeEach(() => {
		(useSelector as jest.Mock).mockReturnValue({
			maxTime: 1000,
			minTime: 0,
			loading: false,
		});
		server.use(
			rest.post(listErrorsURL, async (req, res, ctx) => {
				const body = await req.json();
				postListErrorsSpy(body);
				return res(ctx.status(200), ctx.json(MOCK_ERROR_LIST));
			}),
		);
		server.use(
			rest.post(countErrorsURL, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(540)),
			),
		);
	});

	it('renders correctly with default props', async () => {
		render(<Exceptions />);
		const item = await screen.findByText(/redis timeout/i);
		expect(item).toBeInTheDocument();
	});

	it('should sort Error Message appropriately', async () => {
		render(<Exceptions />);
		await screen.findByText(/redis timeout/i);

		const caretIconUp = screen.getAllByLabelText('caret-up')[0];
		const caretIconDown = screen.getAllByLabelText('caret-down')[0];

		// sort by ascending
		expect(caretIconUp.className).not.toContain('active');
		fireEvent.click(caretIconUp);
		expect(caretIconUp.className).toContain('active');
		let queryParams = new URLSearchParams(window.location.search);
		expect(queryParams.get('order')).toBe('ascending');
		expect(queryParams.get('orderParam')).toBe('exceptionType');

		// sort by descending
		expect(caretIconDown.className).not.toContain('active');
		fireEvent.click(caretIconDown);
		expect(caretIconDown.className).toContain('active');
		queryParams = new URLSearchParams(window.location.search);
		expect(queryParams.get('order')).toBe('descending');
	});

	it('should call useQueries with exact composite query object', async () => {
		render(<Exceptions initUrl={[INIT_URL_WITH_COMMON_QUERY]} />);
		await screen.findByText(/redis timeout/i);
		expect(postListErrorsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				tags: TAG_FROM_QUERY,
			}),
		);
	});
});
