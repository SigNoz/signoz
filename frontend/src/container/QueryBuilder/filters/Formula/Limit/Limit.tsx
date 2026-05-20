import InputNumber from 'components/InputNumber';

import { selectStyle } from '../../QueryBuilderSearch/config';
import { handleKeyDownLimitFilter } from '../../utils';
import { LimitFilterProps } from './types';

function LimitFilter({ onChange, formula }: LimitFilterProps): JSX.Element {
	return (
		<InputNumber
			min={1}
			value={formula.limit}
			style={selectStyle}
			onChange={onChange}
			onKeyDown={handleKeyDownLimitFilter}
		/>
	);
}

export default LimitFilter;
