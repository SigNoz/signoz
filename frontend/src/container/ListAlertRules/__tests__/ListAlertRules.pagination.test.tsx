import { alertRulesPaginationFixture } from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { cleanup, fireEvent, screen, waitFor } from 'tests/test-utils';

import { flushNuqsUrl, renderListAlertRules, resetUrl } from './_helpers';

jest.mock(
	'@signozhq/ui/divider',
	() => ({
		Divider: ({ children }: { children?: React.ReactNode }): JSX.Element => (
			<div>{children}</div>
		),
	}),
	{ virtual: true },
);

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: jest.fn() })),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.setTimeout(20000);

describe('ListAlertRules — pagination', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		cleanup();
		resetUrl();
		server.use(
			rest.get('http://localhost/api/v2/rules', (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ data: alertRulesPaginationFixture, status: 'success' }),
				),
			),
		);
	});

	afterEach(async () => {
		await flushNuqsUrl();
		resetUrl();
	});

	it('shows first 10 rows on page 1 (default limit)', async () => {
		renderListAlertRules();

		await screen.findByText('Pag Rule 0', {}, { timeout: 5000 });

		for (let i = 0; i < 10; i += 1) {
			expect(screen.getByText(`Pag Rule ${i}`)).toBeInTheDocument();
		}
		expect(screen.queryByText('Pag Rule 10')).not.toBeInTheDocument();
		expect(screen.queryByText('Pag Rule 14')).not.toBeInTheDocument();
	});

	it('shows total count when showTotalCount is enabled', async () => {
		renderListAlertRules();

		await screen.findByText('Pag Rule 0', {}, { timeout: 5000 });

		const totalCount = await screen.findByTestId('pagination-total-count');
		expect(totalCount.textContent).toContain('Showing');
		expect(totalCount.textContent).toContain('of 15');
	});

	it('navigates to page 2 and shows remaining rows', async () => {
		renderListAlertRules();

		await screen.findByText('Pag Rule 0', {}, { timeout: 5000 });

		const nextBtn = screen.getByLabelText('Go to next page');
		fireEvent.click(nextBtn);

		await waitFor(
			() => {
				expect(screen.getByText('Pag Rule 10')).toBeInTheDocument();
				expect(screen.getByText('Pag Rule 14')).toBeInTheDocument();
				expect(screen.queryByText('Pag Rule 0')).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);

		await waitFor(() => {
			expect(window.location.search).toContain('page=2');
		});
	});
});
