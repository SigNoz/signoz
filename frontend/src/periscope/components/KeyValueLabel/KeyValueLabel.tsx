import './KeyValueLabel.styles.scss';

type KeyValueLabelProps = { badgeKey: string; badgeValue: string };

export default function KeyValueLabel({
	badgeKey,
	badgeValue,
}: KeyValueLabelProps): JSX.Element | null {
	if (!badgeKey || !badgeValue) {
		return null;
	}
	return (
		<div className="key-value-label">
			<div className="key-value-label__key">{badgeKey}</div>
			<div className="key-value-label__value">{badgeValue}</div>
		</div>
	);
}
