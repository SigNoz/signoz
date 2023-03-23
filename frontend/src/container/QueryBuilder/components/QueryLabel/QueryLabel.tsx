import { Select } from 'antd';
import React from 'react';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

// ** Types
import { isLabelDropdown, QueryLabelProps } from './QueryLabel.interfaces';
// ** Styles
import { StyledSingleLabel } from './QueryLabel.styled';

const { Option } = Select;

const dataSourceMap = [DataSource.LOGS, DataSource.METRICS, DataSource.TRACES];

export function QueryLabel(props: QueryLabelProps): JSX.Element {
	const isDropdown = isLabelDropdown(props);

	if (!isDropdown) {
		const { dataSource } = props;

		return (
			<StyledSingleLabel
				defaultValue={dataSource}
				showArrow={false}
				dropdownStyle={{ display: 'none' }}
			>
				<Option value={dataSource}>{dataSource}</Option>
			</StyledSingleLabel>
		);
	}

	const { onChange } = props;

	const dataSourceOptions: SelectOption<
		DataSource,
		string
	>[] = dataSourceMap.map((source) => ({
		label: source.charAt(0).toUpperCase() + source.slice(1),
		value: source,
	}));

	return (
		<Select
			defaultValue={dataSourceOptions[0].value}
			options={dataSourceOptions}
			onChange={onChange}
		/>
	);
}
