import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardtypesLegendPositionDTO } from 'api/generated/services/sigNoz.schemas';

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
});
