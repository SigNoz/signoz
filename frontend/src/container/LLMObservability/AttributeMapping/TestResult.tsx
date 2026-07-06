import { Badge } from '@signozhq/ui/badge';
import { SpantypesSpanMapperTestSpanDTO } from 'api/generated/services/sigNoz.schemas';
import { useMemo } from 'react';

import { AttrChangeStatus, diffSpanAttributes } from './testPayload';
import styles from './TestTab.module.scss';

interface TestResultProps {
	index: number;
	span: SpantypesSpanMapperTestSpanDTO;
	inputAttributes: Record<string, unknown>;
}

const STATUS_BADGE: Partial<
	Record<
		AttrChangeStatus,
		{ color: 'success' | 'robin' | 'sienna'; label: string }
	>
> = {
	added: { color: 'success', label: 'populated' },
	changed: { color: 'robin', label: 'remapped' },
	removed: { color: 'sienna', label: 'moved out' },
};

// Only added/removed rows carry a background treatment; the rest render plain.
// Kept as an explicit map so we never do dynamic `styles[...]` access.
const ROW_CLASS: Partial<Record<AttrChangeStatus, string>> = {
	added: styles.added,
	removed: styles.removed,
};

function formatValue(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}
	return JSON.stringify(value);
}

// Renders one transformed span as a key/value list, highlighting which target
// attributes the mappers populated and which source keys a move consumed.
function TestResult({
	index,
	span,
	inputAttributes,
}: TestResultProps): JSX.Element {
	const entries = useMemo(
		() => diffSpanAttributes(inputAttributes, span.attributes ?? {}),
		[inputAttributes, span.attributes],
	);

	return (
		<div className={styles.resultCard} data-testid={`test-result-${index}`}>
			<div className={styles.resultTitle}>Resulting attributes</div>

			{entries.length === 0 ? (
				<div className={styles.resultEmpty}>This span has no attributes.</div>
			) : (
				<div className={styles.attrRows}>
					{entries.map((entry) => {
						const badge = STATUS_BADGE[entry.status];
						return (
							<div
								key={entry.key}
								className={`${styles.attrRow} ${ROW_CLASS[entry.status] ?? ''}`}
							>
								<span className={styles.attrKey} title={entry.key}>
									{entry.key}
								</span>
								<span className={styles.attrValue} title={formatValue(entry.value)}>
									{formatValue(entry.value)}
								</span>
								{badge ? (
									<Badge color={badge.color} variant="outline">
										{badge.label}
									</Badge>
								) : (
									<span />
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default TestResult;
