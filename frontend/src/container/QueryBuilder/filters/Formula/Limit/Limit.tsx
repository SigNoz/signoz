import { InputNumber } from 'antd';
import { DataSource } from 'types/common/queryBuilder';

import { selectStyle } from '../../QueryBuilderSearch/config';
import { handleKeyDownLimitFilter } from '../../utils';
import { LimitFilterProps } from './types';

function LimitFilter({ onChange, formula }: LimitFilterProps): JSX.Element {
	const isMetricsDataSource = formula.dataSource === DataSource.METRICS;

	const isDisabled = isMetricsDataSource;

	return (
		<InputNumber
			min={1}
			type="number"
			value={formula.limit}
			style={selectStyle}
			disabled={isDisabled}
			onChange={onChange}
			onKeyDown={handleKeyDownLimitFilter}
		/>
	);
}

export default LimitFilter;
