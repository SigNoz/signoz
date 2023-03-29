import { Select } from 'antd';
import React from 'react';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';
// ** Helpers
import { transformToUpperCase } from 'utils/transformToUpperCase';

// ** Types
import { isLabelDropdown, QueryLabelProps } from './QueryLabel.interfaces';
// ** Styles
import { StyledSingleLabel } from './QueryLabel.styled';

const { Option } = Select;

const dataSourceMap = [DataSource.LOGS, DataSource.METRICS, DataSource.TRACES];

export function QueryLabel(props: QueryLabelProps): JSX.Element {
	const isDropdown = isLabelDropdown(props);

	if (!isDropdown) {
		const { dataSource, style } = props;

		return (
			<StyledSingleLabel
				defaultValue={dataSource}
				showArrow={false}
				dropdownStyle={{ display: 'none' }}
				style={style}
			>
				<Option value={dataSource}>{transformToUpperCase(dataSource)}</Option>
			</StyledSingleLabel>
		);
	}

	const { onChange, value, style } = props;

	const dataSourceOptions: SelectOption<
		DataSource,
		string
	>[] = dataSourceMap.map((source) => ({
		label: transformToUpperCase(source),
		value: source,
	}));

	return (
		<Select
			defaultValue={dataSourceOptions[0].value}
			options={dataSourceOptions}
			onChange={onChange}
			value={value}
			style={style}
		/>
	);
}
