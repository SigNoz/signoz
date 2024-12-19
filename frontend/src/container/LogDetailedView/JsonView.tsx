import './JsonView.styles.scss';

import MEditor, { EditorProps, Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Switch, Typography } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useMemo, useState } from 'react';

import { JSONViewProps } from './LogDetailedView.types';
import { aggregateAttributesResourcesToString } from './utils';

function JSONView({ logData }: JSONViewProps): JSX.Element {
	const [isWrapWord, setIsWrapWord] = useState<boolean>(true);

	const LogJsonData = useMemo(
		() => aggregateAttributesResourcesToString(logData),
		[logData],
	);

	const isDarkMode = useIsDarkMode();

	const options: EditorProps['options'] = {
		automaticLayout: true,
		readOnly: true,
		wordWrap: isWrapWord ? 'on' : 'off',
		minimap: {
			enabled: false,
		},
		fontWeight: 400,
		// fontFamily: 'SF Mono',
		fontFamily: 'Geist Mono',
		fontSize: 13,
		lineHeight: '18px',
		colorDecorators: true,
		scrollBeyondLastLine: false,
		decorationsOverviewRuler: false,
		scrollbar: {
			vertical: 'hidden',
			horizontal: 'hidden',
		},
		folding: false,
	};

	const handleWrapWord = (checked: boolean): void => {
		setIsWrapWord(checked);
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
			// fontFamily: 'SF Mono',
			fontFamily: 'Space Mono',
			fontSize: 12,
			fontWeight: 'normal',
			lineHeight: 18,
			letterSpacing: -0.06,
		});
	}

	return (
		<div className="json-view-container">
			<MEditor
				value={LogJsonData}
				language="json"
				options={options}
				onChange={(): void => {}}
				height="68vh"
				theme={isDarkMode ? 'my-theme' : 'light'}
				// eslint-disable-next-line react/jsx-no-bind
				beforeMount={setEditorTheme}
			/>

			<div className="json-view-footer">
				<div className="log-switch">
					<div className="wrap-word-switch">
						<Typography.Text>Wrap text</Typography.Text>
						<Switch checked={isWrapWord} onChange={handleWrapWord} size="small" />
					</div>
				</div>
			</div>
		</div>
	);
}

export default JSONView;
