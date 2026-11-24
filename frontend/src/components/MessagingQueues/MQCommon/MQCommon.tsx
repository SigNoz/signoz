import { Tooltip } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';

import './MQCommon.styles.scss';

export function SelectMaxTagPlaceholder(
	omittedValues: Partial<DefaultOptionType>[],
): JSX.Element {
	return (
		<Tooltip title={omittedValues.map(({ value }) => value).join(', ')}>
			<span>+ {omittedValues.length} </span>
		</Tooltip>
	);
}
