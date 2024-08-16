import './QueryBuilderSearch.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { Zap } from 'lucide-react';
import { useState } from 'react';

import { getOptionType } from './utils';

function OptionRendererForLogs({
	label,
	value,
	dataType,
	isIndexed,
	setDynamicPlaceholder,
}: OptionRendererProps): JSX.Element {
	const [truncated, setTruncated] = useState<boolean>(false);
	const optionType = getOptionType(label);

	return (
		<span
			className="option"
			onMouseEnter={(): void => setDynamicPlaceholder(value)}
			onFocus={(): void => setDynamicPlaceholder(value)}
		>
			{optionType ? (
				<Tooltip title={truncated ? `${value}` : ''} placement="topLeft">
					<div className="logs-options-select">
						<section className="left-section">
							{isIndexed ? (
								<Zap size={12} fill={Color.BG_AMBER_500} />
							) : (
								<div className="dot" />
							)}
							<Typography.Text
								className="text value"
								ellipsis={{ onEllipsis: (ellipsis): void => setTruncated(ellipsis) }}
							>
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
				<Tooltip title={truncated ? `${label}` : ''} placement="topLeft">
					<div className="without-option-type">
						<div className="dot" />
						<Typography.Text
							className="text"
							ellipsis={{ onEllipsis: (ellipsis): void => setTruncated(ellipsis) }}
						>
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
