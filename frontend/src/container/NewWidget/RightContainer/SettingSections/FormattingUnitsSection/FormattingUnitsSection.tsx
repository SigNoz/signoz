import { Dispatch, SetStateAction, useMemo } from 'react';
import { Select, Typography } from 'antd';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { PanelDisplay } from 'constants/queryBuilder';
import { SlidersHorizontal } from 'lucide-react';
import { ColumnUnit } from 'types/api/dashboard/getAll';

import { ColumnUnitSelector } from '../../ColumnUnitSelector/ColumnUnitSelector';
import SettingsSection from '../../components/SettingsSection/SettingsSection';
import DashboardYAxisUnitSelectorWrapper from '../../DashboardYAxisUnitSelectorWrapper';

interface FormattingUnitsSectionProps {
	selectedGraphType: PanelDisplay | '';
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
}

export function FormattingUnitsSection({
	selectedGraphType,
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
}: FormattingUnitsSectionProps): JSX.Element {
	const decimapPrecisionOptions = useMemo(
		() => [
			{ label: '0 decimals', value: PrecisionOptionsEnum.ZERO },
			{ label: '1 decimal', value: PrecisionOptionsEnum.ONE },
			{ label: '2 decimals', value: PrecisionOptionsEnum.TWO },
			{ label: '3 decimals', value: PrecisionOptionsEnum.THREE },
		],
		[],
	);
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
						selectedGraphType === PanelDisplay.VALUE ||
						selectedGraphType === PanelDisplay.PIE
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
						style={{ width: '100%' }}
						className="panel-type-select"
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
				/>
			)}
		</SettingsSection>
	);
}
