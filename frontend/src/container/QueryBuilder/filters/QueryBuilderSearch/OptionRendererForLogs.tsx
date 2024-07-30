import './QueryBuilderSearch.styles.scss';

import { Typography } from 'antd';
import cx from 'classnames';
import { Dot, Zap } from 'lucide-react';

import { getOptionType } from './utils';

function OptionRendererForLogs({
	label,
	value,
	dataType,
	isIndexed,
}: OptionRendererProps): JSX.Element {
	const optionType = getOptionType(label);

	console.log(isIndexed);
	return (
		<span className="option">
			{optionType ? (
				// <Tooltip title={`${value}`} placement="topLeft">
				<div className="logs-options-select">
					<section className="left-section">
						{isIndexed ? <Zap size={12} /> : <Dot size={12} />}
						<Typography.Text className="text value">{value}</Typography.Text>
					</section>
					<section className="right-section">
						<div className="text tags data-type-tag">{dataType}</div>
						<div className={cx('text tags option-type-tag', optionType)}>
							<Dot size={12} />
							{optionType}
						</div>
					</section>
				</div>
			) : (
				// </Tooltip>
				// <Tooltip title={label} placement="topLeft">
				<>
					<Dot size={12} />
					<span className="text">{label}</span>
				</>
				// </Tooltip>
			)}
		</span>
	);
}

interface OptionRendererProps {
	label: string;
	value: string;
	dataType: string;
	isIndexed: boolean;
}

export default OptionRendererForLogs;
