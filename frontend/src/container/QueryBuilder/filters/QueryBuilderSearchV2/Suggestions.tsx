import './Suggestions.styles.scss';

import { Tooltip, Typography } from 'antd';
import { isEmpty, isObject } from 'lodash-es';
import { useMemo } from 'react';

import { Option } from './QueryBuilderSearchV2';

function Suggestions(props: Option): React.ReactElement {
	const { label, value } = props;

	const optionType = useMemo(() => {
		if (isObject(value)) {
			return value.type;
		}
		return '';
	}, [value]);

	return (
		<span className="option">
			{!isEmpty(optionType) && isObject(value) ? (
				<Tooltip title={`${value}`} placement="topLeft">
					<div className="selectOptionContainer">
						<div className="option-value">{label}</div>
						<div className="option-meta-data-container">
							<Typography.Text>{value.dataType}</Typography.Text>
							<Typography.Text>{value.type}</Typography.Text>
						</div>
					</div>
				</Tooltip>
			) : (
				<Tooltip title={label} placement="topLeft">
					<span>{label}</span>
				</Tooltip>
			)}
		</span>
	);
}

export default Suggestions;
