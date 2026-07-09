import { fireEvent, render, screen } from '@testing-library/react';

import { PieSlice } from '../../types';
import PieArc from '../PieArc';

jest.mock('components/Graph/yAxisConfig', () => ({
	// Echo the raw value so assertions are deterministic.
	getYAxisFormattedValue: jest.fn((value: string) => value),
}));

const SLICE: PieSlice = { label: 'frontend', value: 50, color: '#f00' };

function renderArc(props: Partial<React.ComponentProps<typeof PieArc>> = {}): {
	onEnter: jest.Mock;
	onLeave: jest.Mock;
	onClick: jest.Mock;
	container: HTMLElement;
} {
	const onEnter = jest.fn();
	const onLeave = jest.fn();
	const onClick = jest.fn();
	const { container } = render(
		<svg>
			<PieArc
				slice={SLICE}
				arcPath="M0,0L1,1"
				centroid={[10, 20]}
				startAngle={0}
				endAngle={Math.PI}
				radius={100}
				totalValue={100}
				labelColor="#fff"
				fill="#f00"
				onEnter={onEnter}
				onLeave={onLeave}
				onClick={onClick}
				{...props}
			/>
		</svg>,
	);
	return { onEnter, onLeave, onClick, container };
}

describe('PieArc', () => {
	it('renders the arc path with the resolved fill', () => {
		const { container } = renderArc();
		const path = container.querySelector('path');
		expect(path).toHaveAttribute('d', 'M0,0L1,1');
		expect(path).toHaveAttribute('fill', '#f00');
	});

	it('shows the leader label + value for a slice above the threshold', () => {
		renderArc(); // 50 / 100 = 0.5
		expect(screen.getByText('frontend')).toBeInTheDocument();
		expect(screen.getByText('50')).toBeInTheDocument();
	});

	it('hides the leader label for a slice below the 3% threshold', () => {
		renderArc({ totalValue: 10000 }); // 50 / 10000 = 0.005
		expect(screen.queryByText('frontend')).not.toBeInTheDocument();
		// the arc path itself still renders
		expect(screen.queryByText('50')).not.toBeInTheDocument();
	});

	it('truncates labels longer than 15 chars', () => {
		renderArc({
			slice: { label: 'a-really-long-service-name', value: 50, color: '#f00' },
		});
		expect(screen.getByText('a-really-lon...')).toBeInTheDocument();
	});

	it('fires onEnter with the slice + centroid, and onLeave / onClick', () => {
		const { onEnter, onLeave, onClick, container } = renderArc();
		const g = container.querySelector('g') as SVGGElement;

		fireEvent.mouseEnter(g);
		expect(onEnter).toHaveBeenCalledWith(SLICE, 10, 20);

		fireEvent.mouseLeave(g);
		expect(onLeave).toHaveBeenCalledTimes(1);

		fireEvent.click(g);
		// onClick now also receives the DOM event (for drill-down popover positioning).
		expect(onClick).toHaveBeenCalledWith(SLICE, expect.anything());
	});
});
