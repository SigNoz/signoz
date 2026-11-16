import type { ComponentProps } from 'react';
import { DashboardtypesComparisonOperatorDTO } from 'api/generated/services/sigNoz.schemas';
import type { GeoMapPlacement } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';
import { ThresholdVariant } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { render, screen, userEvent } from 'tests/test-utils';

import ThresholdsSection from '../ThresholdsSection';

type OnChange = ComponentProps<typeof ThresholdsSection>['onChange'];

const placement = {
	data: {
		colorColumn: { id: 'A', name: 'p99(duration_nano)' },
	},
} as unknown as GeoMapPlacement;

const renderColor = (
	unit: string | undefined,
	value: ComponentProps<typeof ThresholdsSection>['value'] = [],
): jest.MockedFunction<OnChange> => {
	const onChange = jest.fn() as jest.MockedFunction<OnChange>;
	render(
		<ThresholdsSection
			value={value}
			controls={{ variant: ThresholdVariant.COLOR }}
			onChange={onChange}
			geoMapPlacement={placement}
			tableColumns={[
				{ key: 'A', label: 'A · p99(duration_nano)', name: 'p99', unit },
			]}
		/>,
	);
	return onChange;
};

describe('ThresholdsSection, color variant', () => {
	it('adds a threshold with no format and offers none', async () => {
		const onChange = jest.fn() as jest.MockedFunction<OnChange>;
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

	it('names the color column it compares against', () => {
		renderColor('ms');

		expect(
			screen.getByText(
				'Colors a location when A · p99(duration_nano) crosses a value, in place of the palette.',
			),
		).toBeInTheDocument();
	});

	it('flags a unit the color column cannot convert to', async () => {
		renderColor('ms', [
			{
				value: 5,
				unit: 'bytes',
				color: '#F5B225',
				operator: DashboardtypesComparisonOperatorDTO.above,
			},
		]);

		expect(
			screen.getByText('Orange · A · p99(duration_nano)'),
		).toBeInTheDocument();
		await userEvent.click(screen.getByTestId('comparison-threshold-edit-0'));

		expect(
			screen.getByTestId('comparison-threshold-unit-invalid-0'),
		).toHaveTextContent('color column unit');
	});

	it('says a unit only converts once the color column has one', async () => {
		renderColor(undefined, [
			{
				value: 5,
				unit: 'ms',
				color: '#F5B225',
				operator: DashboardtypesComparisonOperatorDTO.above,
			},
		]);
		await userEvent.click(screen.getByTestId('comparison-threshold-edit-0'));

		expect(
			screen.getByTestId('comparison-threshold-unit-unscoped-0'),
		).toHaveTextContent('Formatting & Units');
	});
});
