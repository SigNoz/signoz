import { DashboardtypesHeatmapYScaleDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent } from 'tests/test-utils';

import AxesSection from '../AxesSection';

describe('AxesSection', () => {
	it('renders soft bounds and the log-scale switch when both controls are enabled', () => {
		render(
			<AxesSection
				value={undefined}
				controls={{ minMax: true, logScale: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-soft-min')).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-soft-max')).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-log-scale')).toBeInTheDocument();
	});

	it('hides the soft bounds when minMax is off', () => {
		render(
			<AxesSection
				value={undefined}
				controls={{ logScale: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-soft-min'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-log-scale')).toBeInTheDocument();
	});

	it('writes a numeric soft min through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<AxesSection
				value={undefined}
				controls={{ minMax: true }}
				onChange={onChange}
			/>,
		);

		await user.type(screen.getByTestId('panel-editor-v2-soft-min'), '5');

		expect(onChange).toHaveBeenCalledWith({ softMin: 5 });
	});

	it('clears a soft bound to null when the field is emptied', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<AxesSection
				value={{ softMax: 100 }}
				controls={{ minMax: true }}
				onChange={onChange}
			/>,
		);

		await user.clear(screen.getByTestId('panel-editor-v2-soft-max'));

		expect(onChange).toHaveBeenCalledWith({ softMax: null });
	});

	it('offers the bucket-axis scale instead of the soft bounds when y is on', () => {
		render(
			<AxesSection
				value={undefined}
				controls={{ y: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-y-scale')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-soft-min'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-log-scale'),
		).not.toBeInTheDocument();
	});

	it('offers every bucket-axis scale, symmetric log included', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<AxesSection value={undefined} controls={{ y: true }} onChange={onChange} />,
		);

		['auto', 'linear', 'log', 'symlog'].forEach((scale) =>
			expect(
				screen.getByTestId(`panel-editor-v2-y-scale-${scale}`),
			).toBeInTheDocument(),
		);

		await user.click(screen.getByTestId('panel-editor-v2-y-scale-symlog'));

		expect(onChange).toHaveBeenCalledWith({
			y: { scale: DashboardtypesHeatmapYScaleDTO.symlog },
		});
	});

	it('shows the help for the scale the spec asks for', () => {
		render(
			<AxesSection
				value={{ y: { scale: DashboardtypesHeatmapYScaleDTO.symlog } }}
				controls={{ y: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByText(/mirrored across zero/),
		).toBeInTheDocument();
	});

	it('toggles the logarithmic scale through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<AxesSection
				value={{ isLogScale: false }}
				controls={{ logScale: true }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-editor-v2-log-scale-log'));

		expect(onChange).toHaveBeenCalledWith({ isLogScale: true });
	});

	it('flags a soft min above the soft max', () => {
		render(
			<AxesSection
				value={{ softMin: 23, softMax: 12 }}
				controls={{ minMax: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByText("Min can't be greater than Max."),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/The axis always shows at least this range/),
		).not.toBeInTheDocument();
	});
});
