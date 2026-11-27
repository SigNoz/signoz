import { Callout } from '@signozhq/ui/callout';
import { TriangleAlert } from '@signozhq/icons';
import { findOldSemconvNames } from 'utils/semconv';

import styles from './SemconvEditorWarning.module.scss';

interface SemconvEditorWarningProps {
	value: unknown;
	editor: string;
}

function SemconvEditorWarning({
	value,
	editor,
}: SemconvEditorWarningProps): JSX.Element | null {
	const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
	const renames = findOldSemconvNames(text);
	if (renames.length === 0) {
		return null;
	}

	return (
		<div className={styles.warning}>
			<Callout
				color="warning"
				size="sm"
				icon={<TriangleAlert />}
				testId="semconv-editor-warning"
			>
				{`${editor} contains renamed OpenTelemetry fields: ${renames
					.map(({ old, current }) => `${old} → ${current}`)
					.join(', ')}`}
			</Callout>
		</div>
	);
}

export default SemconvEditorWarning;
