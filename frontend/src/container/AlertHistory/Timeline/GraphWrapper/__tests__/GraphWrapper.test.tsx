import { useGetAlertRuleDetailsTimelineGraphData } from 'pages/AlertDetails/hooks';
import { render, screen } from 'tests/test-utils';

import GraphWrapper from '../GraphWrapper';

jest.mock('pages/AlertDetails/hooks', () => ({
	...jest.requireActual('pages/AlertDetails/hooks'),
	useGetAlertRuleDetailsTimelineGraphData: jest.fn(),
}));

const renderAt = (initialRoute: string): void => {
	render(<GraphWrapper totalCurrentTriggers={4} />, undefined, {
		initialRoute,
	});
};

describe('GraphWrapper', () => {
	beforeEach(() => {
		jest.mocked(useGetAlertRuleDetailsTimelineGraphData).mockReturnValue({
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: undefined,
			isValidRuleId: true,
			ruleId: '1',
		});
	});

	it('names the window in the title for a relative range', () => {
		renderAt('/alerts/history?ruleId=1&relativeTime=6h');

		expect(screen.getByTestId('timeline-graph-title')).toHaveTextContent(
			/^4 triggers in 6h$/,
		);
	});

	it('leaves the window out of the title for an absolute range', () => {
		renderAt(
			'/alerts/history?ruleId=1&startTime=1762732800000&endTime=1762905600000',
		);

		expect(screen.getByTestId('timeline-graph-title')).toHaveTextContent(
			/^4 triggers$/,
		);
	});
});
