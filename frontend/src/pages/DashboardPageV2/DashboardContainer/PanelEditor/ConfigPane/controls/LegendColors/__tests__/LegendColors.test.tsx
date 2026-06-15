import { fireEvent, render, screen } from '@testing-library/react';

import type { LegendSeries } from '../../../../hooks/useLegendSeries';
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
		expect(screen.getByText(/run the panel/i)).toBeInTheDocument();
	});

	it('renders the search box once series are present', () => {
		render(
			<LegendColors series={SERIES} value={undefined} onChange={jest.fn()} />,
		);

		expect(
			screen.getByTestId('panel-editor-v2-legend-search'),
		).toBeInTheDocument();
	});

	it('shows a no-match message when the search filters everything out', () => {
		render(
			<LegendColors series={SERIES} value={undefined} onChange={jest.fn()} />,
		);

		fireEvent.change(screen.getByTestId('panel-editor-v2-legend-search'), {
			target: { value: 'zzz' },
		});

		expect(screen.getByText(/no series match/i)).toBeInTheDocument();
	});
});
