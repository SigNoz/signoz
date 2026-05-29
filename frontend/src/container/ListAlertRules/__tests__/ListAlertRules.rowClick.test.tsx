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

const safeNavigateMock = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: safeNavigateMock })),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.setTimeout(20000);

describe('ListAlertRules — row click navigation', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		cleanup();
		resetUrl();
	});

	afterEach(async () => {
		await flushNuqsUrl();
		resetUrl();
	});

	it('clicking a row calls safeNavigate to alerts/overview with composite query + ruleId', async () => {
		renderListAlertRules();

		const ruleCell = await screen.findByText(
			'High CPU Alert',
			{},
			{ timeout: 5000 },
		);

		const td = ruleCell.closest('td');
		expect(td).not.toBeNull();
		fireEvent.click(td as HTMLElement);

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});

		const [url] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('/alerts/overview?');
		expect(url).toContain('ruleId=rule-1');
		expect(url).toContain('panelTypes=graph');
		expect(url).toContain('compositeQuery=');
	});

	it('ctrl+click on a row navigates with newTab option', async () => {
		renderListAlertRules();

		const ruleCell = await screen.findByText(
			'High CPU Alert',
			{},
			{ timeout: 5000 },
		);

		const td = ruleCell.closest('td');
		fireEvent.click(td as HTMLElement, { ctrlKey: true });

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});

		const [url, options] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('ruleId=rule-1');
		expect(options).toStrictEqual(expect.objectContaining({ newTab: true }));
	});
});
