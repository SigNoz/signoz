import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { LegendSeries } from 'pages/DashboardPage/DashboardContainer/Panels/utils/legendSeries';
import LegendColors from '../LegendColors';

const SERIES: LegendSeries[] = [
	{ label: 'frontend', defaultColor: '#ff0000' },
	{ label: 'cartservice', defaultColor: '#00ff00' },
];

describe('LegendColors', () => {
	it('shows a hint when there are no resolved series', () => {
		render(<LegendColors series={[]} value={undefined} onChange={jest.fn()} />);

		expect(
			screen.queryByTestId('panel-editor-v2-legend-colors'),
		).not.toBeInTheDocument();
		expect(screen.getByText(/run the query/i)).toBeInTheDocument();
	});

	it('renders the search box once series are present', () => {
		render(
			<LegendColors series={SERIES} value={undefined} onChange={jest.fn()} />,
		);

		expect(
			screen.getByTestId('panel-editor-v2-legend-search'),
		).toBeInTheDocument();
	});

	it('shows a no-match message when the search filters everything out', async () => {
		const user = userEvent.setup();
		render(
			<LegendColors series={SERIES} value={undefined} onChange={jest.fn()} />,
		);

		await user.clear(screen.getByTestId('panel-editor-v2-legend-search'));
		await user.type(screen.getByTestId('panel-editor-v2-legend-search'), 'zzz');

		expect(screen.getByText(/no series match/i)).toBeInTheDocument();
	});
});
