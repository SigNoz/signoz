import { memo } from 'react';
import { SelectSimple } from '@signozhq/ui/select';
import { DataSource } from 'types/common/queryBuilder';
// ** Helpers
import { transformToUpperCase } from 'utils/transformToUpperCase';

// ** Types
import { QueryLabelProps } from './DataSourceDropdown.interfaces';

const dataSourceMap = [DataSource.LOGS, DataSource.METRICS, DataSource.TRACES];

const exploreDataSourceMap = [DataSource.LOGS, DataSource.TRACES];

export const DataSourceDropdown = memo(function DataSourceDropdown(
	props: QueryLabelProps,
): JSX.Element {
	const { onChange, value, style, isListViewPanel = false, className } = props;

	const items = isListViewPanel
		? exploreDataSourceMap.map((source) => ({
				label: transformToUpperCase(source),
				value: source,
			}))
		: dataSourceMap.map((source) => ({
				label: transformToUpperCase(source),
				value: source,
			}));

	const handleChange = (val: string | string[]): void => {
		onChange(val as DataSource);
	};

	return (
		<SelectSimple
			defaultValue={items[0].value}
			items={items}
			onChange={handleChange}
			testId={props['data-testid']}
			value={value}
			style={style}
			className={className}
		/>
	);
});
