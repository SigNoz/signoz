import { memo } from 'react';
import { Select } from 'antd';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';
// ** Helpers
import { transformToUpperCase } from 'utils/transformToUpperCase';

// ** Types
import { QueryLabelProps } from './DataSourceDropdown.interfaces';
import { signalsToDataSources } from './DataSourceDropdown.utils';

const ALL_SIGNALS = [
	TelemetrytypesSignalDTO.logs,
	TelemetrytypesSignalDTO.metrics,
	TelemetrytypesSignalDTO.traces,
];

export const DataSourceDropdown = memo(function DataSourceDropdown(
	props: QueryLabelProps,
): JSX.Element {
	const { onChange, value, style, allowedDataSources = ALL_SIGNALS } = props;

	const dataSourceOptions: SelectOption<DataSource, string>[] =
		signalsToDataSources(allowedDataSources).map((source) => ({
			label: transformToUpperCase(source),
			value: source,
		}));

	return (
		<Select
			defaultValue={dataSourceOptions[0].value}
			options={dataSourceOptions}
			onChange={onChange}
			data-testid={props['data-testid']}
			value={value}
			style={style}
		/>
	);
});
