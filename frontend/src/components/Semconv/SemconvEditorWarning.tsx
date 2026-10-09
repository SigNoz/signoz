import { Alert } from 'antd';
import { findOldSemconvNames } from 'utils/semconv';

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
		<Alert
			type="warning"
			showIcon
			data-testid="semconv-editor-warning"
			message={`${editor} contains renamed OpenTelemetry fields`}
			description={renames
				.map(({ old, current }) => `${old} → ${current}`)
				.join(', ')}
		/>
	);
}

export default SemconvEditorWarning;
