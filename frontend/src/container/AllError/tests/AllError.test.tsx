import '@testing-library/jest-dom';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

	describe('pagination edge cases', () => {
		it('should navigate to page 2 when pageSize=100 and clicking next', async () => {
			// Arrange: start with pageSize=100 and offset=0
			render(
				<Exceptions
					initUrl={[
						`/exceptions?pageSize=100&offset=0&order=ascending&orderParam=serviceName`,
					]}
				/>,
			);

			// Wait for initial load
			await screen.findByText(/redis timeout/i);

			const nextPageItem = screen.getByTitle('Next Page');
			const nextPageButton = nextPageItem.querySelector(
				'button',
			) as HTMLButtonElement;
			fireEvent.click(nextPageButton);

			await waitFor(() => {
				const qp = new URLSearchParams(window.location.search);
				expect(qp.get('offset')).toBe('100');
			});
			const queryParams = new URLSearchParams(window.location.search);
			expect(queryParams.get('pageSize')).toBe('100');
			expect(queryParams.get('offset')).toBe('100');
		});

		it('initializes current page from URL (offset/pageSize)', async () => {
			// offset=100, pageSize=100 => current page should be 2
			render(
				<Exceptions
					initUrl={[
						`/exceptions?pageSize=100&offset=100&order=ascending&orderParam=serviceName`,
					]}
				/>,
			);
			await screen.findByText(/redis timeout/i);
			const activeItem = document.querySelector('.ant-pagination-item-active');
			expect(activeItem?.textContent).toBe('2');
			const qp = new URLSearchParams(window.location.search);
			expect(qp.get('pageSize')).toBe('100');
			expect(qp.get('offset')).toBe('100');
		});

		it('clicking a numbered page updates offset correctly', async () => {
			// pageSize=100, click page 3 => offset = 200
			render(
				<Exceptions
					initUrl={[
						`/exceptions?pageSize=100&offset=0&order=ascending&orderParam=serviceName`,
					]}
				/>,
			);
			await screen.findByText(/redis timeout/i);
			const page3Item = screen.getByTitle('3');
			const page3Anchor = page3Item.querySelector('a') as HTMLAnchorElement;
			fireEvent.click(page3Anchor);
			await waitFor(() => {
				const qp = new URLSearchParams(window.location.search);
				expect(qp.get('offset')).toBe('200');
			});
		});
	});
});
