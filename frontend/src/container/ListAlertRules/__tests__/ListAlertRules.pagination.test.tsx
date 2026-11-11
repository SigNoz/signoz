import userEvent from '@testing-library/user-event';
import {
	alertRulesPaginationFixture,
	listRulesV3Response,
} from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, waitFor } from 'tests/test-utils';
import { getCurrentNuqsQueryString } from 'tests/nuqs-helpers';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — pagination', () => {
	let requests: URLSearchParams[];

	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		requests = [];
		server.use(
			rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
				requests.push(req.url.searchParams);
				return res(
					ctx.status(200),
					ctx.json(
						listRulesV3Response(alertRulesPaginationFixture, req.url.searchParams),
					),
				);
			}),
		);
	});

	it('requests the first page with the default limit and renders it', async () => {
		renderListAlertRules();

		await screen.findByText('Pag Rule 0');

		expect(requests[0].get('limit')).toBe('10');
		expect(requests[0].get('offset')).toBe('0');
		for (let i = 0; i < 10; i += 1) {
			expect(screen.getByText(`Pag Rule ${i}`)).toBeInTheDocument();
		}
		expect(screen.queryByText('Pag Rule 10')).not.toBeInTheDocument();
	});

	it('shows the total count from the API response', async () => {
		renderListAlertRules();

		await screen.findByText('Pag Rule 0');

		const totalCount = await screen.findByTestId('pagination-total-count');
		expect(totalCount.textContent).toContain('Showing');
		expect(totalCount.textContent).toContain('of 15');
	});

	it('navigates to page 2 by requesting the next offset', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('Pag Rule 0');

		await user.click(screen.getByLabelText('Go to next page'));

		await waitFor(() => {
			expect(screen.getByText('Pag Rule 10')).toBeInTheDocument();
			expect(screen.getByText('Pag Rule 14')).toBeInTheDocument();
			expect(screen.queryByText('Pag Rule 0')).not.toBeInTheDocument();
		});

		const lastRequest = requests[requests.length - 1];
		expect(lastRequest.get('limit')).toBe('10');
		expect(lastRequest.get('offset')).toBe('10');
		await waitFor(() => {
			expect(getCurrentNuqsQueryString()).toContain('page=2');
		});
	});

	it('requests the page from the URL on load', async () => {
		renderListAlertRules({ initialRoute: '/?page=2' });

		await screen.findByText('Pag Rule 10');

		expect(requests[0].get('offset')).toBe('10');
		expect(screen.queryByText('Pag Rule 0')).not.toBeInTheDocument();
	});
});
