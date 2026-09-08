import { Color } from '@signozhq/design-tokens';
import {
	DashboardtypesHeatmapColorModeDTO,
	DashboardtypesHeatmapColorScaleDTO,
	DashboardtypesHeatmapPaletteDTO,
} from 'api/generated/services/sigNoz.schemas';
import { DEFAULT_COLOR_STEPS } from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';
import { render, screen, userEvent } from 'tests/test-utils';

import HeatmapColorsField from '../HeatmapColorsField';

const PALETTE_CARD = `panel-editor-v2-heatmap-palette-${DashboardtypesHeatmapPaletteDTO.lagoon}`;

describe('HeatmapColorsField', () => {
	it('shows the ramp the grid will draw, with what resolved it', () => {
		render(
			<HeatmapColorsField
				value={{
					palette: DashboardtypesHeatmapPaletteDTO.lava,
					scale: DashboardtypesHeatmapColorScaleDTO.log,
					steps: 32,
				}}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-heatmap-preview'),
		).toBeInTheDocument();
		expect(screen.getByText('lava · log · 32 steps')).toBeInTheDocument();
	});

	it('labels the ramp ends with the counts it is stretched between', () => {
		render(
			<HeatmapColorsField value={{ maxCount: 4000 }} onChange={jest.fn()} />,
		);

		// An unset minimum always resolves to 0; an unset maximum needs the data.
		expect(screen.getByText('0')).toBeInTheDocument();
		expect(screen.getByText('4,000')).toBeInTheDocument();
	});

	it('offers the palettes as the ramps they are in palette mode', () => {
		render(
			<HeatmapColorsField
				value={{ mode: DashboardtypesHeatmapColorModeDTO.palette }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId(PALETTE_CARD)).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-heatmap-color-scale'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-heatmap-color-steps'),
		).toBeInTheDocument();
	});

	it('swaps the palettes for the base colour in opacity mode', () => {
		render(
			<HeatmapColorsField
				value={{ mode: DashboardtypesHeatmapColorModeDTO.opacity }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.queryByTestId(PALETTE_CARD)).not.toBeInTheDocument();
		expect(screen.getByText('Base color')).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-heatmap-fill-robin'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-heatmap-fill-custom'),
		).toBeInTheDocument();
	});

	it('writes the colour mode through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<HeatmapColorsField
				value={{ mode: DashboardtypesHeatmapColorModeDTO.palette }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByText('Opacity'));

		expect(onChange).toHaveBeenCalledWith({
			mode: DashboardtypesHeatmapColorModeDTO.opacity,
		});
	});

	it('writes the picked palette through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<HeatmapColorsField value={undefined} onChange={onChange} />);

		await user.click(screen.getByTestId(PALETTE_CARD));

		expect(onChange).toHaveBeenCalledWith({
			palette: DashboardtypesHeatmapPaletteDTO.lagoon,
		});
	});

	it('marks the palette the spec asks for as the selected one', () => {
		render(
			<HeatmapColorsField
				value={{ palette: DashboardtypesHeatmapPaletteDTO.lagoon }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId(PALETTE_CARD)).toHaveAttribute(
			'aria-pressed',
			'true',
		);
	});

	it('writes the colour scale through onChange and says what it drives', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<HeatmapColorsField value={undefined} onChange={onChange} />);

		expect(
			screen.getByText(/How a count maps onto the ramp/),
		).toBeInTheDocument();

		await user.click(screen.getByText('Sqrt'));

		expect(onChange).toHaveBeenCalledWith({
			scale: DashboardtypesHeatmapColorScaleDTO.sqrt,
		});
	});

	it('steps off the default step count, which stands in until it is moved', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<HeatmapColorsField value={undefined} onChange={onChange} />);

		expect(screen.getByRole('slider')).toHaveAttribute(
			'aria-valuenow',
			String(DEFAULT_COLOR_STEPS),
		);

		screen.getByRole('slider').focus();
		await user.keyboard('{ArrowRight}');

		expect(onChange).toHaveBeenLastCalledWith({
			steps: DEFAULT_COLOR_STEPS + 1,
		});
	});

	it('cannot be taken past the step counts the chart can draw', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<HeatmapColorsField value={{ steps: 2 }} onChange={onChange} />);

		const slider = screen.getByRole('slider');
		expect(slider).toHaveAttribute('aria-valuemin', '2');
		expect(slider).toHaveAttribute('aria-valuemax', '128');

		// Already at the floor, so there is no step to take and nothing to write.
		slider.focus();
		await user.keyboard('{ArrowLeft}');

		expect(onChange).not.toHaveBeenCalled();
	});

	it('writes a pinned count bound through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<HeatmapColorsField value={undefined} onChange={onChange} />);

		await user.type(
			screen.getByTestId('panel-editor-v2-heatmap-max-count'),
			'500',
		);

		expect(onChange).toHaveBeenLastCalledWith({ maxCount: 500 });
	});

	it('clears a count bound to null, which asks for the derived one', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<HeatmapColorsField value={{ maxCount: 500 }} onChange={onChange} />);

		await user.clear(screen.getByTestId('panel-editor-v2-heatmap-max-count'));

		expect(onChange).toHaveBeenCalledWith({ maxCount: null });
	});

	it('writes a preset base colour through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<HeatmapColorsField
				value={{ mode: DashboardtypesHeatmapColorModeDTO.opacity }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-editor-v2-heatmap-fill-forest'));

		expect(onChange).toHaveBeenCalledWith({
			mode: DashboardtypesHeatmapColorModeDTO.opacity,
			fill: Color.BG_FOREST_400,
		});
	});

	it('marks the preset the spec asks for, whatever case its hex is in', () => {
		render(
			<HeatmapColorsField
				value={{
					mode: DashboardtypesHeatmapColorModeDTO.opacity,
					fill: Color.BG_FOREST_400.toUpperCase(),
				}}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-heatmap-fill-forest'),
		).toHaveAttribute('aria-pressed', 'true');
	});

	it('shows a fill that is no preset as the custom one', () => {
		render(
			<HeatmapColorsField
				value={{
					mode: DashboardtypesHeatmapColorModeDTO.opacity,
					fill: '#0060e6',
				}}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByText('#0060E6')).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-heatmap-fill-robin'),
		).toHaveAttribute('aria-pressed', 'false');
	});

	it('names the group colour as the fill until one is picked', () => {
		render(
			<HeatmapColorsField
				value={{ mode: DashboardtypesHeatmapColorModeDTO.opacity }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByText('group colour')).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-heatmap-fill-robin'),
		).toHaveAttribute('aria-pressed', 'false');
	});
});
