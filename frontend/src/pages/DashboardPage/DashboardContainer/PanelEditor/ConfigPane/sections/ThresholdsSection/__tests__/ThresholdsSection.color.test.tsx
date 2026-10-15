import { ThresholdVariant } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { render, screen, userEvent } from 'tests/test-utils';

import ThresholdsSection from '../ThresholdsSection';

describe('ThresholdsSection, color variant', () => {
	it('adds a threshold with no format and offers none', async () => {
		const onChange = jest.fn();
		const { unmount } = render(
			<ThresholdsSection
				value={[]}
				controls={{ variant: ThresholdVariant.COLOR }}
				onChange={onChange}
			/>,
		);

		await userEvent.click(
			screen.getByTestId('panel-editor-v2-add-color-threshold'),
		);

		const [added] = onChange.mock.calls[0][0];
		expect(added).toStrictEqual({
			value: 0,
			color: added.color,
			operator: 'above',
		});

		unmount();
		render(
			<ThresholdsSection
				value={[added]}
				controls={{ variant: ThresholdVariant.COLOR }}
				onChange={onChange}
			/>,
		);
		await userEvent.click(screen.getByTestId('comparison-threshold-edit-0'));

		expect(
			screen.getByTestId('comparison-threshold-value-0'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('comparison-threshold-format-0'),
		).not.toBeInTheDocument();
	});
});
