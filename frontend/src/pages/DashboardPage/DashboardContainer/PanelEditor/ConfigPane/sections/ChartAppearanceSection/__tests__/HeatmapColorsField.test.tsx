import {
	DashboardtypesHeatmapColorModeDTO,
	DashboardtypesHeatmapColorScaleDTO,
	DashboardtypesHeatmapPaletteDTO,
} from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent } from 'tests/test-utils';

import HeatmapColorsField from '../HeatmapColorsField';

describe('HeatmapColorsField', () => {
	it('offers the palette picker in palette mode', () => {
		render(
			<HeatmapColorsField
				value={{ mode: DashboardtypesHeatmapColorModeDTO.palette }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-heatmap-palette'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-heatmap-color-scale'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-heatmap-color-steps'),
		).toBeInTheDocument();
	});

	it('swaps the palette picker for a fill colour in opacity mode', () => {
		render(
			<HeatmapColorsField
				value={{ mode: DashboardtypesHeatmapColorModeDTO.opacity }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-heatmap-palette'),
		).not.toBeInTheDocument();
		expect(screen.getByText('Fill color')).toBeInTheDocument();
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

	it('writes the colour scale through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<HeatmapColorsField value={undefined} onChange={onChange} />);

		await user.click(screen.getByText('Sqrt'));

		expect(onChange).toHaveBeenCalledWith({
			scale: DashboardtypesHeatmapColorScaleDTO.sqrt,
		});
	});

	it('clamps a step count the chart could not draw', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<HeatmapColorsField value={undefined} onChange={onChange} />);

		await user.type(
			screen.getByTestId('panel-editor-v2-heatmap-color-steps'),
			'1',
		);

		expect(onChange).toHaveBeenLastCalledWith({ steps: 2 });
	});

	it('clears a count bound to null, which asks for the derived one', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<HeatmapColorsField value={{ maxCount: 500 }} onChange={onChange} />);

		await user.clear(screen.getByTestId('panel-editor-v2-heatmap-max-count'));

		expect(onChange).toHaveBeenCalledWith({ maxCount: null });
	});

	it('resets the fill to empty, which follows the group colour again', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<HeatmapColorsField
				value={{
					mode: DashboardtypesHeatmapColorModeDTO.opacity,
					fill: '#ff0000',
				}}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-editor-v2-heatmap-fill-reset'));

		expect(onChange).toHaveBeenCalledWith({
			mode: DashboardtypesHeatmapColorModeDTO.opacity,
			fill: '',
		});
	});

	it('shows the selected palette', () => {
		render(
			<HeatmapColorsField
				value={{ palette: DashboardtypesHeatmapPaletteDTO.lagoon }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByText('Lagoon')).toBeInTheDocument();
	});
});
