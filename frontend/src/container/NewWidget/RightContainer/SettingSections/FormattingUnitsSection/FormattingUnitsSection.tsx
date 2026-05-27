import { Dispatch, SetStateAction, useMemo } from 'react';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { PanelDisplay } from 'constants/queryBuilder';
import { SlidersHorizontal } from '@signozhq/icons';
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
	const precisionItems = useMemo(
		() =>
			decimapPrecisionOptions.map((opt) => ({
				value: String(opt.value),
				label: opt.label,
			})),
		[decimapPrecisionOptions],
	);

	const handlePrecisionChange = (value: string | string[]): void => {
		if (Array.isArray(value)) {
			return;
		}
		const parsedValue =
			value === PrecisionOptionsEnum.FULL
				? PrecisionOptionsEnum.FULL
				: (Number(value) as PrecisionOption);
		setDecimalPrecision(parsedValue);
	};

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
					<SelectSimple
						items={precisionItems}
						value={String(decimalPrecision)}
						className="panel-type-select"
						data-testid="decimal-precision-selector"
						onChange={handlePrecisionChange}
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
