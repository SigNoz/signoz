import { Dispatch, SetStateAction } from 'react';
import { Select, Typography } from 'antd';
import { PrecisionOption } from 'components/Graph/types';
import { PanelDisplay } from 'constants/queryBuilder';
import { SlidersHorizontal } from 'lucide-react';
import { ColumnUnit } from 'types/api/dashboard/getAll';

import { ColumnUnitSelector } from '../../ColumnUnitSelector/ColumnUnitSelector';
import SettingsSection from '../../components/SettingsSection/SettingsSection';
import DashboardYAxisUnitSelectorWrapper from '../../DashboardYAxisUnitSelectorWrapper';

interface FormattingUnitsSectionProps {
	selectedPanelDisplay: PanelDisplay | '';
	yAxisUnit: string;
	setYAxisUnit: Dispatch<SetStateAction<string>>;
	isNewDashboard: boolean;
	decimalPrecision: PrecisionOption;
	setDecimalPrecision: Dispatch<SetStateAction<PrecisionOption>>;
	columnUnits: ColumnUnit;
	setColumnUnits: Dispatch<SetStateAction<ColumnUnit>>;
	allowYAxisUnit: boolean;
	allowDecimalPrecision: boolean;
	allowPanelColumnPreference: boolean;
	decimapPrecisionOptions: { label: string; value: PrecisionOption }[];
}

export default function FormattingUnitsSection({
	selectedPanelDisplay,
	yAxisUnit,
	setYAxisUnit,
	isNewDashboard,
	decimalPrecision,
	setDecimalPrecision,
	columnUnits,
	setColumnUnits,
	allowYAxisUnit,
	allowDecimalPrecision,
	allowPanelColumnPreference,
	decimapPrecisionOptions,
}: FormattingUnitsSectionProps): JSX.Element {
	return (
		<SettingsSection
			title="Formatting & Units"
			icon={<SlidersHorizontal size={14} />}
		>
			{allowYAxisUnit && (
				<DashboardYAxisUnitSelectorWrapper
					onSelect={setYAxisUnit}
					value={yAxisUnit || ''}
					fieldLabel={
						selectedPanelDisplay === PanelDisplay.VALUE ||
						selectedPanelDisplay === PanelDisplay.PIE
							? 'Unit'
							: 'Y Axis Unit'
					}
					shouldUpdateYAxisUnit={isNewDashboard}
				/>
			)}

			{allowDecimalPrecision && (
				<section className="decimal-precision-selector control-container">
					<Typography.Text className="section-heading">
						Decimal Precision
					</Typography.Text>
					<Select
						options={decimapPrecisionOptions}
						value={decimalPrecision}
						className="panel-type-select"
						data-testid="decimal-precision-selector"
						defaultValue={decimapPrecisionOptions[0]?.value}
						onChange={(val: PrecisionOption): void => setDecimalPrecision(val)}
					/>
				</section>
			)}

			{allowPanelColumnPreference && (
				<ColumnUnitSelector
					columnUnits={columnUnits}
					setColumnUnits={setColumnUnits}
					isNewDashboard={isNewDashboard}
					data-testid="column-unit-selector"
				/>
			)}
		</SettingsSection>
	);
}
