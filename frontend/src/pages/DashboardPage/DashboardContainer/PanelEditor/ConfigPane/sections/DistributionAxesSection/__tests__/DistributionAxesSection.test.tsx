import {
	DashboardtypesDistributionXScaleDTO,
	DashboardtypesDistributionYScaleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent } from 'tests/test-utils';

import DistributionAxesSection from '../DistributionAxesSection';

describe('DistributionAxesSection', () => {
	it('opens on the defaults the chart draws: auto buckets, linear counts', () => {
		render(<DistributionAxesSection value={undefined} onChange={jest.fn()} />);

		expect(
			screen.getByText(
				'Log for buckets spanning two or more orders of magnitude, otherwise linear.',
			),
		).toBeInTheDocument();
		expect(
			screen.getByText('Bar heights proportional to counts.'),
		).toBeInTheDocument();
	});

	it('writes the x scale without dropping the y scale', async () => {
		const onChange = jest.fn();
		render(
			<DistributionAxesSection
				value={{ y: { scale: DashboardtypesDistributionYScaleDTO.log } }}
				onChange={onChange}
			/>,
		);

		await userEvent.click(screen.getByText('Equal'));

		expect(onChange).toHaveBeenCalledWith({
			x: { scale: DashboardtypesDistributionXScaleDTO.ordinal },
			y: { scale: DashboardtypesDistributionYScaleDTO.log },
		});
	});

	it('writes the y scale', async () => {
		const onChange = jest.fn();
		render(<DistributionAxesSection value={undefined} onChange={onChange} />);

		await userEvent.click(screen.getByText('Logarithmic'));

		expect(onChange).toHaveBeenCalledWith({
			y: { scale: DashboardtypesDistributionYScaleDTO.log },
		});
	});
});
