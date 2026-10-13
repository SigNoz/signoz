import { AlignLeft, Copy, Download, RotateCcw } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import styles from './JsonEditorToolbar.module.scss';

interface JsonEditorToolbarProps {
	isDirty: boolean;
	/** Locked/no-permission — Format and Reset (draft mutators) are disabled. */
	readOnly?: boolean;
	onFormat: () => void;
	onCopy: () => void;
	onDownload: () => void;
	onReset: () => void;
}

function JsonEditorToolbar({
	isDirty,
	readOnly = false,
	onFormat,
	onCopy,
	onDownload,
	onReset,
}: JsonEditorToolbarProps): JSX.Element {
	return (
		<div className={styles.toolbar}>
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				prefix={<AlignLeft size={14} />}
				testId="json-editor-format"
				disabled={readOnly}
				onClick={onFormat}
			>
				Format
			</Button>
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				prefix={<Copy size={14} />}
				testId="json-editor-copy"
				onClick={onCopy}
			>
				Copy
			</Button>
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				prefix={<Download size={14} />}
				testId="json-editor-download"
				onClick={onDownload}
			>
				Download
			</Button>
			<div className={styles.spacer} />
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				prefix={<RotateCcw size={14} />}
				testId="json-editor-reset"
				disabled={readOnly || !isDirty}
				onClick={onReset}
			>
				Reset
			</Button>
		</div>
	);
}

export default JsonEditorToolbar;
