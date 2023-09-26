import { InputNumber } from 'antd';

import { selectStyle } from '../../QueryBuilderSearch/config';
import { handleKeyDownLimitFilter } from '../../utils';
import { LimitFilterProps } from './types';

function LimitFilter({ onChange, formula }: LimitFilterProps): JSX.Element {
	return (
		<InputNumber
			min={1}
			type="number"
			value={formula.limit}
			style={selectStyle}
			onChange={onChange}
			onKeyDown={handleKeyDownLimitFilter}
		/>
	);
}

export default LimitFilter;
