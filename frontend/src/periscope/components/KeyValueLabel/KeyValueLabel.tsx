import { isValidElement } from 'react';
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

/**
 * badgeKey/badgeValue are typed as `string | ReactNode`, but callers have accidentally
 * passed plain objects (e.g. an untyped API error/value) that satisfy that type yet
 * aren't renderable, crashing the whole app with "Objects are not valid as a React
 * child" (React error #31). Coerce anything that isn't a primitive or a valid element
 * to a string instead of handing it to React as a child.
 */
function toRenderable(value: unknown): React.ReactNode {
	if (
		value === null ||
		value === undefined ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		isValidElement(value)
	) {
		return value as React.ReactNode;
	}

	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

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

	const safeBadgeKey = toRenderable(badgeKey);
	const safeBadgeValue = toRenderable(badgeValue);

	const renderValue = (): JSX.Element => {
		if (typeof safeBadgeValue !== 'string') {
			return <div className="key-value-label__value">{safeBadgeValue}</div>;
		}

		return (
			<Tooltip title={safeBadgeValue}>
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
					<TrimmedText text={safeBadgeValue} maxCharacters={maxCharacters} />
				</div>
			</Tooltip>
		);
	};

	return (
		<div className={`key-value-label key-value-label--${direction}`}>
			<div className="key-value-label__key">
				{typeof safeBadgeKey === 'string' ? (
					<TrimmedText text={safeBadgeKey} maxCharacters={maxCharacters} />
				) : (
					safeBadgeKey
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
