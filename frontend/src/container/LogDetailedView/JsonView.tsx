import MEditor, { EditorProps, Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useMemo } from 'react';

import { JSONViewProps } from './LogDetailedView.types';
import { aggregateAttributesResourcesToString } from './utils';

function JSONView({ logData }: JSONViewProps): JSX.Element {
	const LogJsonData = useMemo(
		() => aggregateAttributesResourcesToString(logData),
		[logData],
	);

	const isDarkMode = useIsDarkMode();

	const options: EditorProps['options'] = {
		automaticLayout: true,
		readOnly: true,
		wordWrap: 'on',
		minimap: {
			enabled: false,
		},
		fontWeight: 400,
		fontFamily: 'SF Mono',
		fontSize: 14,
		lineHeight: '18px',
		colorDecorators: true,
		scrollBeyondLastLine: false,
		scrollbar: {
			vertical: 'hidden',
			horizontal: 'hidden',
		},
	};

	function setEditorTheme(monaco: Monaco): void {
		monaco.editor.defineTheme('my-theme', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'string.key.json', foreground: Color.BG_VANILLA_400 },
				{ token: 'string.value.json', foreground: Color.BG_ROBIN_400 },
			],
			colors: {
				'editor.background': Color.BG_INK_400,
			},
			fontFamily: 'SF Mono',
			fontSize: 12,
			fontWeight: 'normal',
			lineHeight: 18,
			letterSpacing: -0.06,
		});
	}

	return (
		<div style={{ marginTop: '0.5rem' }}>
			<MEditor
				value={LogJsonData}
				language="json"
				options={options}
				onChange={(): void => {}}
				height="40vh"
				theme={isDarkMode ? 'my-theme' : 'light'}
				// eslint-disable-next-line react/jsx-no-bind
				beforeMount={setEditorTheme}
			/>
		</div>
	);
}

export default JSONView;
