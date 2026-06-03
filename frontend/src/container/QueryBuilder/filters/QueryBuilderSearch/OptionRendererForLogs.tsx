import { Color } from '@signozhq/design-tokens';
import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { Zap } from '@signozhq/icons';

import { getOptionType } from './utils';

import './QueryBuilderSearch.styles.scss';

function OptionRendererForLogs({
	label,
	value,
	dataType,
	isIndexed,
	setDynamicPlaceholder,
}: OptionRendererProps): JSX.Element {
	const optionType = getOptionType(label);

	return (
		<span
			className="option"
			onMouseEnter={(): void => setDynamicPlaceholder(value)}
			onFocus={(): void => setDynamicPlaceholder(value)}
		>
			{optionType ? (
				<Tooltip title={value} placement="topLeft">
					<div className="logs-options-select">
						<section className="left-section">
							{isIndexed ? (
								<Zap size={12} fill={Color.BG_AMBER_500} />
							) : (
								<div className="dot" />
							)}
							<Typography.Text className="text value" truncate={1}>
								{value}
							</Typography.Text>
						</section>
						<section className="right-section">
							<div className="text tags data-type-tag">{dataType}</div>
							<div className={cx('text tags option-type-tag', optionType)}>
								<div className="dot" />
								{optionType}
							</div>
						</section>
					</div>
				</Tooltip>
			) : (
				<Tooltip title={label} placement="topLeft">
					<div className="without-option-type">
						<div className="dot" />
						<Typography.Text className="text" truncate={1}>
							{label}
						</Typography.Text>
					</div>
				</Tooltip>
			)}
		</span>
	);
}

interface OptionRendererProps {
	label: string;
	value: string;
	dataType: string;
	isIndexed: boolean;
	setDynamicPlaceholder: React.Dispatch<React.SetStateAction<string>>;
}

export default OptionRendererForLogs;
