import { useState } from 'react';
import MEditor, { EditorProps, Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Switch, Typography } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';

import './JsonView.styles.scss';

export interface JsonViewProps {
	data: string;
	height?: string;
}

const editorOptions: EditorProps['options'] = {
	automaticLayout: true,
	readOnly: true,
	wordWrap: 'on',
	minimap: { enabled: false },
	fontWeight: 400,
	fontFamily: 'SF Mono, Geist Mono, Fira Code, monospace',
	fontSize: 12,
	lineHeight: '18px',
	colorDecorators: true,
	scrollBeyondLastLine: false,
	decorationsOverviewRuler: false,
	scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
	folding: false,
};

function setEditorTheme(monaco: Monaco): void {
	monaco.editor.defineTheme('signoz-dark', {
		base: 'vs-dark',
		inherit: true,
		rules: [
			{ token: 'string.key.json', foreground: Color.BG_VANILLA_400 },
			{ token: 'string.value.json', foreground: Color.BG_ROBIN_400 },
		],
		colors: {
			'editor.background': '#00000000', // transparent
		},
		fontFamily: 'SF Mono, Geist Mono, Fira Code, monospace',
		fontSize: 12,
		fontWeight: 'normal',
		lineHeight: 18,
		letterSpacing: -0.06,
	});
}

function JsonView({ data, height = '575px' }: JsonViewProps): JSX.Element {
	const [isWrapWord, setIsWrapWord] = useState(true);
	const isDarkMode = useIsDarkMode();

	return (
		<div className="json-view">
			<MEditor
				value={data}
				language="json"
				options={{ ...editorOptions, wordWrap: isWrapWord ? 'on' : 'off' }}
				onChange={(): void => {}}
				height={height}
				theme={isDarkMode ? 'signoz-dark' : 'light'}
				beforeMount={setEditorTheme}
			/>
			<div className="json-view__footer">
				<div className="json-view__wrap-toggle">
					<Typography.Text>Wrap text</Typography.Text>
					<Switch
						checked={isWrapWord}
						onChange={(checked): void => setIsWrapWord(checked)}
						size="small"
					/>
				</div>
			</div>
		</div>
	);
}

export default JsonView;
