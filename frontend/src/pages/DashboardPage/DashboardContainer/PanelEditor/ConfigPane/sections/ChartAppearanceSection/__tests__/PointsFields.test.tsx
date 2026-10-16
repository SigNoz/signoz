import { render, screen, userEvent } from 'tests/test-utils';

import ChartAppearanceSection from '../ChartAppearanceSection';

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

describe('ChartAppearanceSection points', () => {
	it('offers one point size when nothing sizes the dots', () => {
		render(
			<ChartAppearanceSection
				value={undefined}
				controls={{ points: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-point-size')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-point-size-range'),
		).not.toBeInTheDocument();
		expect(screen.getByText('6 px')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Every dot uses this size. Map a Size column to draw a bubble chart.',
			),
		).toBeInTheDocument();
		expect(screen.getByText('70%')).toBeInTheDocument();
	});

	it('offers a min/max range named after the size column when one is bound', () => {
		render(
			<ChartAppearanceSection
				value={{ points: { minSize: 5 } }}
				controls={{ points: true }}
				sizeColumnLabel="B.count()"
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-point-size-range'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-point-size'),
		).not.toBeInTheDocument();
		expect(screen.getByText('5–24 px')).toBeInTheDocument();
		expect(
			screen.getByText(
				"Each dot's area scales with B.count() between min and max.",
			),
		).toBeInTheDocument();
	});

	it('steps the fixed size by a whole pixel, keeping the range', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ points: { size: 6, minSize: 4, maxSize: 30 } }}
				controls={{ points: true }}
				onChange={onChange}
			/>,
		);

		const [sizeThumb] = screen.getAllByRole('slider');
		sizeThumb.focus();
		await user.keyboard('{ArrowRight}');

		expect(onChange).toHaveBeenLastCalledWith({
			points: { size: 7, minSize: 4, maxSize: 30 },
		});
	});

	it('stops the opacity at 10%', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ points: { opacity: 0.1 } }}
				controls={{ points: true }}
				onChange={onChange}
			/>,
		);

		const thumbs = screen.getAllByRole('slider');
		const opacityThumb = thumbs[thumbs.length - 1];
		expect(opacityThumb).toHaveAttribute('aria-valuemin', '0.1');
		opacityThumb.focus();
		await user.keyboard('{ArrowLeft}');

		expect(onChange).not.toHaveBeenCalled();
	});

	it('leaves the points out of a kind that does not declare them', () => {
		render(
			<ChartAppearanceSection
				value={undefined}
				controls={{ lineStyle: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-point-size'),
		).not.toBeInTheDocument();
		expect(screen.queryByText('Fill opacity')).not.toBeInTheDocument();
	});
});
