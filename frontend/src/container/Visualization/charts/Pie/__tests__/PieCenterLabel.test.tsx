import { render, screen } from '@testing-library/react';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';

import PieCenterLabel from '../PieCenterLabel';

jest.mock('components/Graph/yAxisConfig', () => ({
	getYAxisFormattedValue: jest.fn(),
}));

const mockFormat = getYAxisFormattedValue as jest.MockedFunction<
	typeof getYAxisFormattedValue
>;

function renderInSvg(node: JSX.Element): ReturnType<typeof render> {
	// PieCenterLabel returns an SVG <text>, so it needs an <svg> host.
	return render(<svg>{node}</svg>);
}

describe('PieCenterLabel', () => {
	const baseProps = {
		total: 3700,
		radius: 100,
		innerRadius: 60,
		color: '#fff',
	};

	it('renders the formatted total (numeric + unit suffix) as one numeric tspan when there is no separate unit', () => {
		mockFormat.mockReturnValue('3.7K');
		renderInSvg(<PieCenterLabel {...baseProps} />);
		expect(screen.getByText('3.7K')).toBeInTheDocument();
	});

	it('splits the numeric part and the trailing unit into separate tspans', () => {
		mockFormat.mockReturnValue('1.2 MB');
		renderInSvg(<PieCenterLabel {...baseProps} />);
		expect(screen.getByText('1.2')).toBeInTheDocument();
		expect(screen.getByText('MB')).toBeInTheDocument();
	});

	it('passes the unit + precision through to the formatter', () => {
		mockFormat.mockReturnValue('100');
		renderInSvg(<PieCenterLabel {...baseProps} total={100} yAxisUnit="bytes" />);
		expect(mockFormat).toHaveBeenCalledWith('100', 'bytes', undefined);
	});
});
