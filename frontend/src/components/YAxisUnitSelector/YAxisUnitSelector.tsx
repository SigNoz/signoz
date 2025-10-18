import './styles.scss';

import { WarningFilled } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Select, Tooltip } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import classNames from 'classnames';
import { useMemo } from 'react';

import { UniversalYAxisUnitMappings, Y_AXIS_CATEGORIES } from './constants';
import { UniversalYAxisUnit, YAxisUnitSelectorProps } from './types';
import { mapMetricUnitToUniversalUnit } from './utils';

function YAxisUnitSelector({
	value,
	onChange,
	placeholder = 'Please select a unit',
	loading = false,
	initialValue,
}: YAxisUnitSelectorProps): JSX.Element {
	const universalUnit = mapMetricUnitToUniversalUnit(value);

	const initialCategory = useMemo(() => {
		const initialUniversalUnit = mapMetricUnitToUniversalUnit(initialValue);
		const unit = Y_AXIS_CATEGORIES.find((category) =>
			category.units.some((unit) => unit.id === initialUniversalUnit),
		);
		return unit?.name;
	}, [initialValue]);

	const currentCategory = useMemo(() => {
		const currentUniversalUnit = mapMetricUnitToUniversalUnit(value);
		const unit = Y_AXIS_CATEGORIES.find((category) =>
			category.units.some((unit) => unit.id === currentUniversalUnit),
		);
		return unit?.name;
	}, [value]);

	const incorrectCategoryMessage = useMemo(() => {
		if (
			initialCategory &&
			currentCategory &&
			initialCategory !== currentCategory
		) {
			return `Incorrect unit selected. Please select a unit from the ${initialCategory} category.`;
		}
		return '';
	}, [initialCategory, currentCategory]);

	const handleSearch = (
		searchTerm: string,
		currentOption: DefaultOptionType | undefined,
	): boolean => {
		if (!currentOption?.value) return false;

		const search = searchTerm.toLowerCase();
		const unitId = currentOption.value.toString().toLowerCase();
		const unitLabel = currentOption.children?.toString().toLowerCase() || '';

		// Check label and id
		if (unitId.includes(search) || unitLabel.includes(search)) return true;

		// Check aliases (from the mapping) using array iteration
		const aliases = Array.from(
			UniversalYAxisUnitMappings[currentOption.value as UniversalYAxisUnit] ?? [],
		);

		return aliases.some((alias) => alias.toLowerCase().includes(search));
	};

	return (
		<div className="y-axis-unit-selector-component">
			<Select
				showSearch
				value={universalUnit}
				onChange={onChange}
				placeholder={placeholder}
				filterOption={(input, option): boolean => handleSearch(input, option)}
				loading={loading}
				suffixIcon={
					incorrectCategoryMessage ? (
						<Tooltip title={incorrectCategoryMessage}>
							<WarningFilled color={Color.BG_AMBER_500} />
						</Tooltip>
					) : null
				}
				className={classNames({
					'warning-state': incorrectCategoryMessage,
				})}
			>
				{Y_AXIS_CATEGORIES.map((category) => (
					<Select.OptGroup key={category.name} label={category.name}>
						{category.units.map((unit) => (
							<Select.Option key={unit.id} value={unit.id}>
								{unit.name}
							</Select.Option>
						))}
					</Select.OptGroup>
				))}
			</Select>
		</div>
	);
}

export default YAxisUnitSelector;
