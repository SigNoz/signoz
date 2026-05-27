import { useMemo } from 'react';
import { SolidAlertTriangle } from '@signozhq/icons';
import {
	ComboboxSimple,
	ComboboxSimpleGroup,
	ComboboxSimpleItem,
} from '@signozhq/ui/combobox';
import { Tooltip } from 'antd';
import classNames from 'classnames';

import { UniversalYAxisUnitMappings } from './constants';
import { UniversalYAxisUnit, YAxisUnitSelectorProps } from './types';
import {
	getUniversalNameFromMetricUnit,
	getYAxisCategories,
	mapMetricUnitToUniversalUnit,
} from './utils';

import './styles.scss';

function YAxisUnitSelector({
	value,
	onChange,
	placeholder = 'Please select a unit',
	loading = false,
	'data-testid': dataTestId,
	source,
	initialValue,
	categoriesOverride,
	containerClassName,
}: YAxisUnitSelectorProps): JSX.Element {
	const universalUnit = mapMetricUnitToUniversalUnit(value);

	const incompatibleUnitMessage = useMemo(() => {
		if (!initialValue || !value || loading) {
			return '';
		}
		const initialUniversalUnit = mapMetricUnitToUniversalUnit(initialValue);
		const currentUniversalUnit = mapMetricUnitToUniversalUnit(value);
		if (initialUniversalUnit !== currentUniversalUnit) {
			const initialUniversalUnitName =
				getUniversalNameFromMetricUnit(initialValue);
			const currentUniversalUnitName = getUniversalNameFromMetricUnit(value);
			return `Unit mismatch. The metric was sent with unit ${initialUniversalUnitName}, but ${currentUniversalUnitName} is selected.`;
		}
		return '';
	}, [initialValue, value, loading]);

	const categoriesToRender = useMemo(
		() => categoriesOverride || getYAxisCategories(source),
		[categoriesOverride, source],
	);

	const groups: ComboboxSimpleGroup[] = useMemo(
		() =>
			categoriesToRender.map((category) => ({
				heading: category.name,
				items: category.units.map((unit): ComboboxSimpleItem => {
					const aliases = Array.from(
						UniversalYAxisUnitMappings[unit.id as UniversalYAxisUnit] ?? [],
					);
					return {
						value: unit.id,
						label: unit.name,
						keywords: aliases,
					};
				}),
			})),
		[categoriesToRender],
	);

	const handleChange = (val: string | string[]): void => {
		onChange(val as UniversalYAxisUnit);
	};

	return (
		<div
			className={classNames('y-axis-unit-selector-component', containerClassName)}
		>
			<ComboboxSimple
				value={universalUnit ?? undefined}
				onChange={handleChange}
				placeholder={placeholder}
				loading={loading}
				className={classNames({
					'warning-state': !!incompatibleUnitMessage,
				})}
				testId={dataTestId}
				groups={groups}
			/>
			{incompatibleUnitMessage && (
				<Tooltip title={incompatibleUnitMessage}>
					<SolidAlertTriangle role="img" aria-label="warning" size="md" />
				</Tooltip>
			)}
		</div>
	);
}

export default YAxisUnitSelector;
