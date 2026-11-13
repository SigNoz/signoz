import { render, screen } from 'tests/test-utils';

import StatsCard from '../StatsCard';

const renderAt = (initialRoute: string): void => {
	render(
		<StatsCard
			title="Total Triggered"
			totalCurrentCount={12}
			totalPastCount={10}
		/>,
		undefined,
		{ initialRoute },
	);
};

describe('StatsCard', () => {
	it('names the window in the change label for a relative range', () => {
		renderAt('/alerts/history?ruleId=1&relativeTime=6h');

		expect(screen.getByTestId('stats-card-change')).toHaveTextContent(
			/^20% vs Last 6h$/,
		);
	});

	it('leaves the window out of the change label for an absolute range', () => {
		renderAt(
			'/alerts/history?ruleId=1&startTime=1762732800000&endTime=1762905600000',
		);

		expect(screen.getByTestId('stats-card-change')).toHaveTextContent(/^20%$/);
	});
});
