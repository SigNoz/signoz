import { useState } from 'react';
import MEditor, { Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Maximize2 } from '@signozhq/icons';
import { useIsDarkMode } from 'hooks/useDarkMode';

import styles from './NewDashboardModal.module.scss';

interface Props {
	value: string;
	onChange?: (value: string) => void;
	readOnly?: boolean;
	height?: string;
}

const defineTheme = (monaco: Monaco): void => {
	monaco.editor.defineTheme('my-theme', {
		base: 'vs-dark',
		inherit: true,
		rules: [
			{ token: 'string.key.json', foreground: Color.BG_VANILLA_400 },
			{ token: 'string.value.json', foreground: Color.BG_ROBIN_400 },
		],
		colors: { 'editor.background': Color.BG_INK_300 },
	});
};

// JSON editor with a one-click "expand" into an extra-wide modal for easier
// editing/review. The expanded editor shares the same value, so edits persist.
function JsonEditor({
	value,
	onChange,
	readOnly = false,
	height = '38vh',
}: Props): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [expanded, setExpanded] = useState(false);

	const renderEditor = (editorHeight: string): JSX.Element => (
		<MEditor
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
			theme={isDarkMode ? 'my-theme' : 'light'}
			beforeMount={defineTheme}
		/>
	);

	return (
		<div className={styles.editorWrap}>
			<Button
				variant="ghost"
				color="secondary"
				size="icon"
				className={styles.expandBtn}
				aria-label="Expand editor"
				testId="json-editor-expand"
				onClick={(): void => setExpanded(true)}
			>
				<Maximize2 size={14} />
			</Button>
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
