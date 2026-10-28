import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Maximize2 } from '@signozhq/icons';
import MonacoEditor from 'lib/monaco/MonacoEditor';

import styles from './NewDashboardModal.module.scss';

interface Props {
	value: string;
	onChange?: (value: string) => void;
	readOnly?: boolean;
	height?: string;
}

// JSON editor with a one-click "expand" into an extra-wide modal for easier
// editing/review. The expanded editor shares the same value, so edits persist.
function JsonEditor({
	value,
	onChange,
	readOnly = false,
	height = '38vh',
}: Props): JSX.Element {
	const [expanded, setExpanded] = useState(false);

	const renderEditor = (editorHeight: string): JSX.Element => (
		<MonacoEditor
			language="json"
			height={editorHeight}
			value={value}
			onChange={(next): void => onChange?.(next || '')}
			options={{
				readOnly,
				scrollbar: { alwaysConsumeMouseWheel: false },
				minimap: { enabled: false },
				fontSize: 14,
				fontFamily: 'Space Mono',
			}}
		/>
	);

	return (
		<div className={styles.editorWrap}>
			<div className={styles.expandBtn}>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label="Expand editor"
					testId="json-editor-expand"
					onClick={(): void => setExpanded(true)}
				>
					<Maximize2 size={14} />
				</Button>
			</div>
			<div className={styles.editor}>{renderEditor(height)}</div>

			<DialogWrapper
				title={readOnly ? 'Preview JSON' : 'Edit JSON'}
				open={expanded}
				width="extra-wide"
				onOpenChange={(next): void => {
					if (!next) {
						setExpanded(false);
					}
				}}
			>
				<div className={styles.editorExpanded}>{renderEditor('70vh')}</div>
			</DialogWrapper>
		</div>
	);
}

export default JsonEditor;
