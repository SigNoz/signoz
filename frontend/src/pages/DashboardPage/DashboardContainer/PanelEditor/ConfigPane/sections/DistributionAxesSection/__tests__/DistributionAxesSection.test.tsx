import { DashboardtypesDistributionYScaleDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent } from 'tests/test-utils';

import DistributionAxesSection from '../DistributionAxesSection';

describe('DistributionAxesSection', () => {
	it('opens on the defaults the chart draws: every bucket, linear counts', () => {
		render(<DistributionAxesSection value={undefined} onChange={jest.fn()} />);

		expect(
			screen.getByText(
				'Hides buckets outside the range. Leave empty to show them all.',
			),
		).toBeInTheDocument();
		expect(
			screen.getByText('Bar heights proportional to counts.'),
		).toBeInTheDocument();
	});

	it('writes the x min without dropping the max or the y scale', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(
			<DistributionAxesSection
				value={{
					x: { max: 100 },
					y: { scale: DashboardtypesDistributionYScaleDTO.log },
				}}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-editor-v2-distribution-x-min'));
		await user.paste('10');

		expect(onChange).toHaveBeenCalledWith({
			x: { min: 10, max: 100 },
			y: { scale: DashboardtypesDistributionYScaleDTO.log },
		});
	});

	it('flags a min above the max', () => {
		render(
			<DistributionAxesSection
				value={{ x: { min: 100, max: 10 } }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByText("Min can't be greater than max."),
		).toBeInTheDocument();
	});

	it('writes the y scale', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(<DistributionAxesSection value={undefined} onChange={onChange} />);

		await user.click(screen.getByText('Logarithmic'));

		expect(onChange).toHaveBeenCalledWith({
			y: { scale: DashboardtypesDistributionYScaleDTO.log },
		});
	});
});
