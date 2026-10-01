import { DashboardtypesAxisScaleDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent } from 'tests/test-utils';

import ScatterAxesSection from '../ScatterAxesSection';

describe('ScatterAxesSection', () => {
	it('renders bounds and scale for both axes', () => {
		render(<ScatterAxesSection value={undefined} onChange={jest.fn()} />);

		['x', 'y'].forEach((axis) => {
			expect(
				screen.getByTestId(`panel-editor-v2-${axis}-soft-min`),
			).toBeInTheDocument();
			expect(
				screen.getByTestId(`panel-editor-v2-${axis}-soft-max`),
			).toBeInTheDocument();
			expect(
				screen.getByTestId(`panel-editor-v2-${axis}-scale`),
			).toBeInTheDocument();
		});
	});

	it('writes a soft bound to its own axis', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ScatterAxesSection
				value={{ x: { scale: DashboardtypesAxisScaleDTO.log } }}
				onChange={onChange}
			/>,
		);

		await user.type(screen.getByTestId('panel-editor-v2-y-soft-max'), '5');

		expect(onChange).toHaveBeenCalledWith({
			x: { scale: DashboardtypesAxisScaleDTO.log },
			y: { softMax: 5 },
		});
	});

	it('shows the plotted column as each label placeholder', () => {
		render(
			<ScatterAxesSection
				value={undefined}
				onChange={jest.fn()}
				axisColumnNames={{ x: 'Request rate', y: 'p99 latency' }}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-x-label')).toHaveAttribute(
			'placeholder',
			'Request rate',
		);
		expect(screen.getByTestId('panel-editor-v2-y-label')).toHaveAttribute(
			'placeholder',
			'p99 latency',
		);
	});

	it('resets one axis without touching the other', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ScatterAxesSection
				value={{
					x: { scale: DashboardtypesAxisScaleDTO.log, label: 'Throughput' },
					y: { scale: DashboardtypesAxisScaleDTO.symlog },
				}}
				savedValue={{}}
				onChange={onChange}
			/>,
		);

		const [resetX] = screen.getAllByTestId('config-field-reset');
		await user.click(resetX);

		expect(onChange).toHaveBeenCalledWith({
			x: undefined,
			y: { scale: DashboardtypesAxisScaleDTO.symlog },
		});
	});

	it('says a log axis ignores a bound at or below zero', () => {
		render(
			<ScatterAxesSection
				value={{
					x: { scale: DashboardtypesAxisScaleDTO.log, softMin: -10 },
					y: { scale: DashboardtypesAxisScaleDTO.symlog, softMin: -10 },
				}}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-x-range-help')).toHaveTextContent(
			"A log axis can't reach 0 or below",
		);
		expect(screen.getByTestId('panel-editor-v2-y-range-help')).toHaveTextContent(
			'The axis always shows at least this range.',
		);
	});

	it('writes an axis label', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<ScatterAxesSection value={undefined} onChange={onChange} />);

		await user.type(screen.getByTestId('panel-editor-v2-y-label'), 'p');

		expect(onChange).toHaveBeenCalledWith({ y: { label: 'p' } });
	});

	it('clears a soft bound to null when the field is emptied', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ScatterAxesSection value={{ x: { softMin: 10 } }} onChange={onChange} />,
		);

		await user.clear(screen.getByTestId('panel-editor-v2-x-soft-min'));

		expect(onChange).toHaveBeenCalledWith({ x: { softMin: null } });
	});

	it.each([
		DashboardtypesAxisScaleDTO.linear,
		DashboardtypesAxisScaleDTO.log,
		DashboardtypesAxisScaleDTO.symlog,
	])('sets the x scale to %s', async (scale) => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<ScatterAxesSection value={undefined} onChange={onChange} />);

		await user.click(screen.getByTestId(`panel-editor-v2-x-scale-${scale}`));

		expect(onChange).toHaveBeenCalledWith({ x: { scale } });
	});

	it('marks a changed scale against the saved value and resets it', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ScatterAxesSection
				value={{ y: { scale: DashboardtypesAxisScaleDTO.log } }}
				savedValue={{ y: { scale: DashboardtypesAxisScaleDTO.auto } }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByRole('button', { name: /reset/i }));

		expect(onChange).toHaveBeenCalledWith({
			y: { scale: DashboardtypesAxisScaleDTO.auto },
		});
	});
});
