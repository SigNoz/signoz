import { Dispatch, SetStateAction } from 'react';
import { Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Axis3D } from '@signozhq/icons';

import SettingsSection from '../../components/SettingsSection/SettingsSection';
import DashboardYAxisUnitSelectorWrapper from '../../DashboardYAxisUnitSelectorWrapper';

interface ScatterAxesSectionProps {
	queryNames: string[];
	xQuery?: string;
	setXQuery: Dispatch<SetStateAction<string | undefined>>;
	yQuery?: string;
	setYQuery: Dispatch<SetStateAction<string | undefined>>;
	xAxisUnit: string;
	setXAxisUnit: Dispatch<SetStateAction<string>>;
	yAxisUnit: string;
	setYAxisUnit: Dispatch<SetStateAction<string>>;
	isNewDashboard: boolean;
}

export default function ScatterAxesSection({
	queryNames,
	xQuery,
	setXQuery,
	yQuery,
	setYQuery,
	xAxisUnit,
	setXAxisUnit,
	yAxisUnit,
	setYAxisUnit,
	isNewDashboard,
}: ScatterAxesSectionProps): JSX.Element {
	const queryOptions = queryNames.map((name) => ({ value: name, label: name }));

	return (
		<SettingsSection title="Scatter Axes" icon={<Axis3D size={14} />}>
			<section className="control-container">
				<Typography.Text className="section-heading">X Axis Query</Typography.Text>
				<Select
					className="panel-type-select"
					placeholder="First query"
					value={xQuery}
					options={queryOptions}
					onChange={setXQuery}
					data-testid="scatter-x-query-select"
				/>
			</section>

			<DashboardYAxisUnitSelectorWrapper
				onSelect={setXAxisUnit}
				value={xAxisUnit || ''}
				fieldLabel="X Axis Unit"
				shouldUpdateYAxisUnit={false}
				selectedQueryName={xQuery}
				data-testid="scatter-x-axis-unit"
			/>

			<section className="control-container">
				<Typography.Text className="section-heading">Y Axis Query</Typography.Text>
				<Select
					className="panel-type-select"
					placeholder="Second query"
					value={yQuery}
					options={queryOptions}
					onChange={setYQuery}
					data-testid="scatter-y-query-select"
				/>
			</section>

			<DashboardYAxisUnitSelectorWrapper
				onSelect={setYAxisUnit}
				value={yAxisUnit || ''}
				fieldLabel="Y Axis Unit"
				shouldUpdateYAxisUnit={isNewDashboard}
				selectedQueryName={yQuery}
				data-testid="scatter-y-axis-unit"
			/>
		</SettingsSection>
	);
}
