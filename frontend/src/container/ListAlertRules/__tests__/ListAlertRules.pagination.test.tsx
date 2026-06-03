import userEvent from '@testing-library/user-event';
import { alertRulesPaginationFixture } from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, waitFor } from 'tests/test-utils';
import { getCurrentNuqsQueryString } from 'tests/nuqs-helpers';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — pagination', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		server.use(
			rest.get('http://localhost/api/v2/rules', (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ data: alertRulesPaginationFixture, status: 'success' }),
				),
			),
		);
	});

	it('shows first 10 rows on page 1 (default limit)', async () => {
		renderListAlertRules();

		await screen.findByText('Pag Rule 0');

		for (let i = 0; i < 10; i += 1) {
			expect(screen.getByText(`Pag Rule ${i}`)).toBeInTheDocument();
		}
		expect(screen.queryByText('Pag Rule 10')).not.toBeInTheDocument();
		expect(screen.queryByText('Pag Rule 14')).not.toBeInTheDocument();
	});

	it('shows total count when showTotalCount is enabled', async () => {
		renderListAlertRules();

		await screen.findByText('Pag Rule 0');

		const totalCount = await screen.findByTestId('pagination-total-count');
		expect(totalCount.textContent).toContain('Showing');
		expect(totalCount.textContent).toContain('of 15');
	});

	it('navigates to page 2 and shows remaining rows', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('Pag Rule 0');

		const nextBtn = screen.getByLabelText('Go to next page');
		await user.click(nextBtn);

		await waitFor(() => {
			expect(screen.getByText('Pag Rule 10')).toBeInTheDocument();
			expect(screen.getByText('Pag Rule 14')).toBeInTheDocument();
			expect(screen.queryByText('Pag Rule 0')).not.toBeInTheDocument();
		});

		await waitFor(() => {
			expect(getCurrentNuqsQueryString()).toContain('page=2');
		});
	});
});
