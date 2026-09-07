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

	it('offers the bucket-axis scale instead of the soft bounds when yScale is on', () => {
		render(
			<AxesSection
				value={undefined}
				controls={{ yScale: true }}
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
			<AxesSection
				value={undefined}
				controls={{ yScale: true }}
				onChange={onChange}
			/>,
		);

		const trigger = screen.getByTestId('panel-editor-v2-y-scale');
		await user.click(
			trigger.querySelector('.ant-select-selector') as HTMLElement,
		);

		await expect(
			screen.findByRole('option', { name: /Auto/ }),
		).resolves.toBeInTheDocument();
		expect(screen.getByRole('option', { name: /Log/ })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /Linear/ })).toBeInTheDocument();

		await user.click(screen.getByRole('option', { name: /Symmetric log/ }));

		expect(onChange).toHaveBeenCalledWith({
			yScale: DashboardtypesHeatmapYScaleDTO.symlog,
		});
	});

	it('shows the scale the spec asks for', () => {
		render(
			<AxesSection
				value={{ yScale: DashboardtypesHeatmapYScaleDTO.symlog }}
				controls={{ yScale: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByText('Symmetric log')).toBeInTheDocument();
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

		await user.click(screen.getByText('Log'));

		expect(onChange).toHaveBeenCalledWith({ isLogScale: true });
	});
});
