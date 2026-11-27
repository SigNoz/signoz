import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	DashboardtypesLegendOrderDTO,
	DashboardtypesLegendPositionDTO,
} from 'api/generated/services/sigNoz.schemas';

import LegendSection from '../LegendSection';

describe('LegendSection', () => {
	it('renders the position toggle with both options when position is enabled', () => {
		render(
			<LegendSection
				value={undefined}
				controls={{ position: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-legend-position'),
		).toBeInTheDocument();
		expect(screen.getByText('Below chart')).toBeInTheDocument();
		expect(screen.getByText('Right of chart')).toBeInTheDocument();
	});

	it('renders nothing when position is not enabled', () => {
		render(
			<LegendSection value={undefined} controls={{}} onChange={jest.fn()} />,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-legend-position'),
		).not.toBeInTheDocument();
	});

	it('writes the chosen position through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<LegendSection
				value={{ position: undefined }}
				controls={{ position: true }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-editor-v2-legend-position-right'));

		expect(onChange).toHaveBeenCalledWith({ position: 'right' });
	});

	it('preserves other legend fields when changing position', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<LegendSection
				value={{
					position: DashboardtypesLegendPositionDTO.bottom,
					customColors: { a: '#fff' },
				}}
				controls={{ position: true }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-editor-v2-legend-position-right'));

		expect(onChange).toHaveBeenCalledWith({
			position: 'right',
			customColors: { a: '#fff' },
		});
	});

	it('hides the series order control unless the kind enables it', () => {
		render(
			<LegendSection
				value={undefined}
				controls={{ position: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-legend-order-mode'),
		).not.toBeInTheDocument();
	});

	it('defaults to by-value order without the per-series list', () => {
		render(
			<LegendSection
				value={undefined}
				controls={{ order: true }}
				onChange={jest.fn()}
				legendSeries={[{ label: 'CPU %', defaultColor: '#fff' }]}
			/>,
		);

		expect(screen.getByRole('radio', { name: 'By value' })).toBeChecked();
		expect(
			screen.queryByTestId('panel-editor-v2-legend-order'),
		).not.toBeInTheDocument();
	});

	it('switches to custom order, keeping the indexes and other legend fields', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<LegendSection
				value={{
					position: DashboardtypesLegendPositionDTO.bottom,
					customOrder: { 'CPU %': -1 },
				}}
				controls={{ order: true }}
				onChange={onChange}
			/>,
		);

		await user.click(
			screen.getByTestId('panel-editor-v2-legend-order-mode-custom'),
		);

		expect(onChange).toHaveBeenCalledWith({
			position: 'bottom',
			order: 'custom',
			customOrder: { 'CPU %': -1 },
		});
	});

	it('shows the per-series list when the order is custom', () => {
		render(
			<LegendSection
				value={{ order: DashboardtypesLegendOrderDTO.custom }}
				controls={{ order: true }}
				onChange={jest.fn()}
				legendSeries={[{ label: 'CPU %', defaultColor: '#fff' }]}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-legend-order'),
		).toBeInTheDocument();
	});
});
