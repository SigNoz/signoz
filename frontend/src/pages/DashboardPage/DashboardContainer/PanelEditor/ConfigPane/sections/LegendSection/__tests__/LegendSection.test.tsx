import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	DashboardtypesLegendPositionDTO,
	DashboardtypesSeriesOrderDTO,
} from 'api/generated/services/sigNoz.schemas';

import LegendSection from '../LegendSection';

// Open the antd Select by clicking its selector, then pick the option by label.
async function pickOption(triggerTestId: string, label: string): Promise<void> {
	const user = userEvent.setup();
	const trigger = screen.getByTestId(triggerTestId);
	await user.click(trigger.querySelector('.ant-select-selector') as HTMLElement);
	await user.click(await screen.findByRole('option', { name: label }));
}

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
		expect(screen.getByText('Bottom')).toBeInTheDocument();
		expect(screen.getByText('Right')).toBeInTheDocument();
	});

	it('renders nothing when position is not enabled', () => {
		render(
			<LegendSection value={undefined} controls={{}} onChange={jest.fn()} />,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-legend-position'),
		).not.toBeInTheDocument();
	});

	it('writes the chosen position through onChange', () => {
		const onChange = jest.fn();
		render(
			<LegendSection
				value={{ position: undefined }}
				controls={{ position: true }}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByText('Right'));

		expect(onChange).toHaveBeenCalledWith({ position: 'right' });
	});

	it('preserves other legend fields when changing position', () => {
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

		fireEvent.click(screen.getByText('Right'));

		expect(onChange).toHaveBeenCalledWith({
			position: 'right',
			customColors: { a: '#fff' },
		});
	});

	it('renders the series order select when seriesOrder is enabled', () => {
		render(
			<LegendSection
				value={undefined}
				controls={{ seriesOrder: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-legend-series-order'),
		).toBeInTheDocument();
		expect(screen.getByText('Series order')).toBeInTheDocument();
	});

	it('omits the series order select when seriesOrder is not enabled', () => {
		render(
			<LegendSection
				value={undefined}
				controls={{ position: true, colors: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-legend-series-order'),
		).not.toBeInTheDocument();
	});

	it('writes the chosen series order through onChange, preserving other fields', async () => {
		const onChange = jest.fn();
		render(
			<LegendSection
				value={{
					position: DashboardtypesLegendPositionDTO.bottom,
					seriesOrder: DashboardtypesSeriesOrderDTO.mean_desc,
				}}
				controls={{ seriesOrder: true }}
				onChange={onChange}
			/>,
		);

		await pickOption('panel-editor-v2-legend-series-order', 'Query Order');

		expect(onChange).toHaveBeenCalledWith({
			position: DashboardtypesLegendPositionDTO.bottom,
			seriesOrder: DashboardtypesSeriesOrderDTO.definition,
		});
	});
});
