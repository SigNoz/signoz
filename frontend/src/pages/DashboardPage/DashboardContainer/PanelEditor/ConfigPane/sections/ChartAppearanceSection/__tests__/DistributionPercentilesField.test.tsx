import { render, screen, userEvent } from 'tests/test-utils';

import DistributionPercentilesField from '../DistributionPercentilesField';
import { resolvePercentileItems } from '../percentileOptions';

describe('DistributionPercentilesField', () => {
	it('opens on, with the values picker shown', () => {
		render(
			<DistributionPercentilesField value={undefined} onChange={jest.fn()} />,
		);

		expect(
			screen.getByTestId('panel-editor-v2-percentile-values'),
		).toBeInTheDocument();
	});

	it('turns markers off, keeping the values for when they come back', async () => {
		const onChange = jest.fn();
		render(
			<DistributionPercentilesField
				value={{ enabled: true, values: [75] }}
				onChange={onChange}
			/>,
		);

		await userEvent.click(screen.getByRole('switch'));

		expect(onChange).toHaveBeenCalledWith({ enabled: false, values: [75] });
	});

	it('hides the values picker while markers are off', () => {
		render(
			<DistributionPercentilesField
				value={{ enabled: false, values: [75] }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-percentile-values'),
		).not.toBeInTheDocument();
	});
});

describe('resolvePercentileItems', () => {
	it('adds a saved value missing from the presets, in order', () => {
		expect(resolvePercentileItems([97]).map(({ label }) => label)).toStrictEqual([
			'p50',
			'p75',
			'p90',
			'p95',
			'p97',
			'p99',
			'p99.9',
		]);
	});
});
