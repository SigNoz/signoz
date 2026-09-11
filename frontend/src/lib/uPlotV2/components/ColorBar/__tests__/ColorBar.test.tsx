import { render, screen } from '@testing-library/react';

import ColorBar from '../ColorBar';

const RAMP = ['#111111', '#555555', '#999999', '#dddddd'];

describe('ColorBar', () => {
	it('renders the domain labels', () => {
		render(<ColorBar ramp={RAMP} minLabel="0" maxLabel="1,204" />);

		expect(screen.getByText('0')).toBeInTheDocument();
		expect(screen.getByText('1,204')).toBeInTheDocument();
	});

	it('renders nothing without a ramp', () => {
		const { container } = render(
			<ColorBar ramp={[]} minLabel="0" maxLabel="0" />,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it('hides the marker when nothing is hovered', () => {
		render(<ColorBar ramp={RAMP} minLabel="0" maxLabel="10" />);

		expect(screen.queryByTestId('color-bar-marker')).not.toBeInTheDocument();
	});

	it('positions the marker at the hovered value', () => {
		render(
			<ColorBar ramp={RAMP} minLabel="0" maxLabel="10" markerPosition={0.25} />,
		);

		expect(screen.getByTestId('color-bar-marker')).toHaveStyle({ left: '25%' });
	});

	it('clamps a marker outside the ramp to its ends', () => {
		const { rerender } = render(
			<ColorBar ramp={RAMP} minLabel="0" maxLabel="10" markerPosition={-2} />,
		);
		expect(screen.getByTestId('color-bar-marker')).toHaveStyle({ left: '0%' });

		rerender(
			<ColorBar ramp={RAMP} minLabel="0" maxLabel="10" markerPosition={4} />,
		);
		expect(screen.getByTestId('color-bar-marker')).toHaveStyle({ left: '100%' });
	});

	it('keys the two states a colour ramp cannot express', () => {
		render(<ColorBar ramp={RAMP} minLabel="0" maxLabel="10" />);

		expect(screen.getByText('no data')).toBeInTheDocument();
		expect(screen.getByText('count 0')).toBeInTheDocument();
	});

	it('draws the count-0 key with the bottom of the ramp', () => {
		render(<ColorBar ramp={RAMP} minLabel="0" maxLabel="10" />);

		expect(screen.getByText('count 0').firstChild).toHaveStyle({
			background: RAMP[0],
		});
	});

	it('hides the state keys when asked', () => {
		render(
			<ColorBar ramp={RAMP} minLabel="0" maxLabel="10" showStateKeys={false} />,
		);

		expect(screen.queryByText('no data')).not.toBeInTheDocument();
	});

	it('captions what the colour encodes', () => {
		render(<ColorBar ramp={RAMP} minLabel="0" maxLabel="10" label="count" />);

		expect(screen.getByText('count')).toBeInTheDocument();
	});

	it('renders hard-edged segments so the bar matches the drawn cells', () => {
		render(
			<ColorBar
				ramp={['#111111', '#dddddd']}
				minLabel="0"
				maxLabel="10"
				data-testid="scale"
			/>,
		);

		const track = screen.getByTestId('scale').querySelector('div');
		expect(track).toHaveStyle({
			background:
				'linear-gradient(to right, #111111 0%, #111111 50%, #dddddd 50%, #dddddd 100%)',
		});
	});
});
