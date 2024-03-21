import { Select } from 'antd';
import { memo } from 'react';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';
// ** Helpers
import { transformToUpperCase } from 'utils/transformToUpperCase';

// ** Types
import { QueryLabelProps } from './DataSourceDropdown.interfaces';

const dataSourceMap = [DataSource.LOGS, DataSource.METRICS, DataSource.TRACES];

const exploreDataSourceMap = [DataSource.LOGS, DataSource.TRACES];

export const DataSourceDropdown = memo(function DataSourceDropdown(
	props: QueryLabelProps,
): JSX.Element {
	const { onChange, value, style, isListViewPanel = false } = props;

	const dataSourceOptions: SelectOption<DataSource, string>[] = isListViewPanel
		? exploreDataSourceMap.map((source) => ({
				label: transformToUpperCase(source),
				value: source,
		  }))
		: dataSourceMap.map((source) => ({
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
});
