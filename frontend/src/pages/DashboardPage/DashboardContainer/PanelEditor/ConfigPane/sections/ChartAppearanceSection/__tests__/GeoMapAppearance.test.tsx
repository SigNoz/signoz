import { render, screen, userEvent } from 'tests/test-utils';

import ChartAppearanceSection from '../ChartAppearanceSection';

const GEO_CONTROLS = { mapColors: true, bubbles: true, labels: true };

describe('ChartAppearanceSection on a geo map', () => {
	it('starts the circle size on the layer default', () => {
		const { unmount } = render(
			<ChartAppearanceSection
				value={undefined}
				controls={GEO_CONTROLS}
				onChange={jest.fn()}
			/>,
		);
		expect(screen.getByText('3–28 px')).toBeInTheDocument();

		unmount();
		render(
			<ChartAppearanceSection
				value={undefined}
				controls={GEO_CONTROLS}
				mapLayer="points"
				onChange={jest.fn()}
			/>,
		);
		expect(screen.getByText('2–8 px')).toBeInTheDocument();
	});

	it('turns names off', async () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ colors: { palette: 'lava' } } as never}
				controls={GEO_CONTROLS}
				onChange={onChange}
			/>,
		);

		await userEvent.click(screen.getByTestId('panel-editor-v2-geo-map-labels'));

		expect(onChange).toHaveBeenCalledWith({
			colors: { palette: 'lava' },
			labels: false,
		});
	});

	it('edits the value range, not a count range', async () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={undefined}
				controls={GEO_CONTROLS}
				onChange={onChange}
			/>,
		);

		await userEvent.type(
			screen.getByTestId('panel-editor-v2-geo-map-max-value'),
			'5',
		);

		expect(onChange).toHaveBeenLastCalledWith({ colors: { max: 5 } });
	});

	it('picks a base color in opacity mode, with no group color to follow', async () => {
		const onChange = jest.fn();
		const { unmount } = render(
			<ChartAppearanceSection
				value={undefined}
				controls={GEO_CONTROLS}
				onChange={onChange}
			/>,
		);

		await userEvent.click(screen.getByRole('radio', { name: 'Opacity' }));
		expect(onChange).toHaveBeenLastCalledWith({ colors: { mode: 'opacity' } });

		unmount();
		render(
			<ChartAppearanceSection
				value={{ colors: { mode: 'opacity' } } as never}
				controls={GEO_CONTROLS}
				onChange={onChange}
			/>,
		);
		expect(
			screen.queryByRole('radio', { name: 'Group color' }),
		).not.toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-heatmap-fill'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-heatmap-palette-lava'),
		).not.toBeInTheDocument();
	});
});
