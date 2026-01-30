import { useMemo } from 'react';
import { WarningFilled } from '@ant-design/icons';
import { Select, Tooltip } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
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
}: YAxisUnitSelectorProps): JSX.Element {
	const universalUnit = mapMetricUnitToUniversalUnit(value);

	const incompatibleUnitMessage = useMemo(() => {
		if (!initialValue || !value || loading) {
			return '';
		}
		const initialUniversalUnit = mapMetricUnitToUniversalUnit(initialValue);
		const currentUniversalUnit = mapMetricUnitToUniversalUnit(value);
		if (initialUniversalUnit !== currentUniversalUnit) {
			const initialUniversalUnitName = getUniversalNameFromMetricUnit(
				initialValue,
			);
			const currentUniversalUnitName = getUniversalNameFromMetricUnit(value);
			return `Unit mismatch. The metric was sent with unit ${initialUniversalUnitName}, but ${currentUniversalUnitName} is selected.`;
		}
		return '';
	}, [initialValue, value, loading]);

	const handleSearch = (
		searchTerm: string,
		currentOption: DefaultOptionType | undefined,
	): boolean => {
		if (!currentOption?.value) {
			return false;
		}

		const search = searchTerm.toLowerCase();
		const unitId = currentOption.value.toString().toLowerCase();
		const unitLabel = currentOption.children?.toString().toLowerCase() || '';

		// Check label and id
		if (unitId.includes(search) || unitLabel.includes(search)) {
			return true;
		}

		// Check aliases (from the mapping) using array iteration
		const aliases = Array.from(
			UniversalYAxisUnitMappings[currentOption.value as UniversalYAxisUnit] ?? [],
		);

		return aliases.some((alias) => alias.toLowerCase().includes(search));
	};

	const categories = getYAxisCategories(source);

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
					incompatibleUnitMessage ? (
						<Tooltip title={incompatibleUnitMessage}>
							<WarningFilled />
						</Tooltip>
					) : undefined
				}
				className={classNames({
					'warning-state': incompatibleUnitMessage,
				})}
				data-testid={dataTestId}
				allowClear
			>
				{categories.map((category) => (
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
