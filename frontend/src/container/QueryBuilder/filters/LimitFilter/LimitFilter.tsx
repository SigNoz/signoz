import { InputNumber } from 'antd';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { selectStyle } from '../QueryBuilderSearch/config';
import { handleKeyDownLimitFilter } from '../utils';

function LimitFilter({ onChange, query }: LimitFilterProps): JSX.Element {
	const isMetricsDataSource = query.dataSource === DataSource.METRICS;

	const isDisabled = isMetricsDataSource && !query.aggregateAttribute.key;

	return (
		<InputNumber
			min={1}
			type="number"
			value={query.limit}
			style={selectStyle}
			disabled={isDisabled}
			onChange={onChange}
			onKeyDown={handleKeyDownLimitFilter}
		/>
	);
}

interface LimitFilterProps {
	onChange: (values: number | null) => void;
	query: IBuilderQuery;
}

export default LimitFilter;
