import { useState } from 'react';
import { EditorProps } from '@monaco-editor/react';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import MonacoEditor from 'lib/monaco/MonacoEditor';

import './JsonView.styles.scss';

export interface JsonViewProps {
	data: string;
	height?: string;
	fontSize?: number;
}

const editorOptions: EditorProps['options'] = {
	automaticLayout: true,
	readOnly: true,
	wordWrap: 'on',
	minimap: { enabled: false },
	fontWeight: '400',
	fontFamily: 'SF Mono, Geist Mono, Fira Code, monospace',
	fontSize: 12,
	lineHeight: 18,
	colorDecorators: true,
	scrollBeyondLastLine: false,
	// Disabled: the transparent editor background leaves the sticky-scroll widget
	// without an opaque backing, so scrolling lines bleed through and overlap it.
	stickyScroll: { enabled: false },
	scrollbar: {
		vertical: 'hidden',
		horizontal: 'hidden',
		// Once the editor can't scroll any further, release the wheel event so
		// the parent container picks it up. Without this Monaco swallows the
		// event at the boundary and outer scroll feels stuck.
		alwaysConsumeMouseWheel: false,
	},
	folding: false,
};

function JsonView({
	data,
	height = '575px',
	fontSize = 12,
}: JsonViewProps): JSX.Element {
	const [isWrapWord, setIsWrapWord] = useState(true);

	return (
		<div className="json-view">
			<MonacoEditor
				value={data}
				language="json"
				options={{
					...editorOptions,
					fontSize,
					wordWrap: isWrapWord ? 'on' : 'off',
				}}
				onChange={(): void => {}}
				height={height}
			/>
			<div className="json-view__footer">
				<div className="json-view__wrap-toggle">
					<Typography.Text>Wrap text</Typography.Text>
					<Switch
						color="primary"
						textPlacement="right"
						value={isWrapWord}
						onChange={(checked): void => setIsWrapWord(checked)}
					/>
				</div>
			</div>
		</div>
	);
}

export default JsonView;
