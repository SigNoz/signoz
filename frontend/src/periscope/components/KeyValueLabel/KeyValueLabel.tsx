import './KeyValueLabel.styles.scss';

import { Tooltip } from 'antd';
import { useMemo } from 'react';

import TrimmedText from '../TrimmedText/TrimmedText';

type KeyValueLabelProps = {
	badgeKey: string;
	badgeValue: string;
	maxCharacters?: number;
};

export default function KeyValueLabel({
	badgeKey,
	badgeValue,
	maxCharacters = 20,
}: KeyValueLabelProps): JSX.Element | null {
	const isUrl = useMemo(() => /^https?:\/\//.test(badgeValue), [badgeValue]);

	if (!badgeKey || !badgeValue) {
		return null;
	}

	return (
		<div className="key-value-label">
			<div className="key-value-label__key">
				<TrimmedText text={badgeKey} maxCharacters={maxCharacters} />
			</div>
			{isUrl ? (
				<a
					href={badgeValue}
					target="_blank"
					rel="noopener noreferrer"
					className="key-value-label__value"
				>
					<TrimmedText text={badgeValue} maxCharacters={maxCharacters} />
				</a>
			) : (
				<Tooltip title={badgeValue}>
					<div className="key-value-label__value">
						<TrimmedText text={badgeValue} maxCharacters={maxCharacters} />
					</div>
				</Tooltip>
			)}
		</div>
	);
}

KeyValueLabel.defaultProps = {
	maxCharacters: 20,
};
