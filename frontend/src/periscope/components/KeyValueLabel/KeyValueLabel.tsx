import { Tooltip } from 'antd';

import TrimmedText from '../TrimmedText/TrimmedText';

import './KeyValueLabel.styles.scss';

// Rethink this component later
type KeyValueLabelProps = {
	badgeKey: string | React.ReactNode;
	badgeValue: string | React.ReactNode;
	direction?: 'row' | 'column';
	maxCharacters?: number;
	onClick?: () => void;
};

export default function KeyValueLabel({
	badgeKey,
	badgeValue,
	direction = 'row',
	maxCharacters = 20,
	onClick,
}: KeyValueLabelProps): JSX.Element | null {
	if (!badgeKey || !badgeValue) {
		return null;
	}

	const renderValue = (): JSX.Element => {
		if (typeof badgeValue !== 'string') {
			return <div className="key-value-label__value">{badgeValue}</div>;
		}

		return (
			<Tooltip title={badgeValue}>
				<div
					className={`key-value-label__value ${
						onClick ? 'key-value-label__value--clickable' : ''
					}`}
					onClick={onClick}
					role={onClick ? 'button' : undefined}
					tabIndex={onClick ? 0 : undefined}
					onKeyDown={
						onClick
							? (e): void => {
									if (e.key === 'Enter' || e.key === ' ') {
										onClick();
									}
								}
							: undefined
					}
				>
					<TrimmedText text={badgeValue} maxCharacters={maxCharacters} />
				</div>
			</Tooltip>
		);
	};

	return (
		<div className={`key-value-label key-value-label--${direction}`}>
			<div className="key-value-label__key">
				{typeof badgeKey === 'string' ? (
					<TrimmedText text={badgeKey} maxCharacters={maxCharacters} />
				) : (
					badgeKey
				)}
			</div>
			{renderValue()}
		</div>
	);
}

KeyValueLabel.defaultProps = {
	maxCharacters: 20,
	direction: 'row',
	onClick: undefined,
};
