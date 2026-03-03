import { useCallback, useMemo, useState } from 'react';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { javascript } from '@codemirror/lang-javascript';
import { Button } from '@signozhq/button';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror, {
	EditorState,
	EditorView,
	Extension,
} from '@uiw/react-codemirror';
import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';

import './CodeBlock.styles.scss';

export type CodeBlockLanguage =
	| 'javascript'
	| 'typescript'
	| 'js'
	| 'ts'
	| 'json'
	| 'bash'
	| 'shell'
	| 'text';

export type CodeBlockTheme = 'light' | 'dark' | 'auto';

interface CodeBlockProps {
	/** The code content to display */
	value: string;
	/** Language for syntax highlighting */
	language?: CodeBlockLanguage;
	/** Theme: 'light' | 'dark' | 'auto' (follows app dark mode when 'auto') */
	theme?: CodeBlockTheme;
	/** Show line numbers */
	lineNumbers?: boolean;
	/** Show copy button */
	showCopyButton?: boolean;
	/** Custom class name for the container */
	className?: string;
	/** Max height in pixels - enables scrolling when content exceeds */
	maxHeight?: number | string;
	/** Callback when copy is clicked */
	onCopy?: (copiedText: string) => void;
}

const LANGUAGE_EXTENSION_MAP: Record<
	CodeBlockLanguage,
	ReturnType<typeof javascript> | undefined
> = {
	javascript: javascript({ jsx: true }),
	typescript: javascript({ jsx: true }),
	js: javascript({ jsx: true }),
	ts: javascript({ jsx: true }),
	json: javascript(), // JSON is valid JS; proper json() would require @codemirror/lang-json
	bash: undefined,
	shell: undefined,
	text: undefined,
};

function CodeBlock({
	value,
	language = 'text',
	theme: themeProp = 'auto',
	lineNumbers = true,
	showCopyButton = true,
	className,
	maxHeight,
	onCopy,
}: CodeBlockProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [isCopied, setIsCopied] = useState(false);

	const resolvedDark = themeProp === 'auto' ? isDarkMode : themeProp === 'dark';
	const theme = resolvedDark ? dracula : githubLight;

	const extensions = useMemo((): Extension[] => {
		const langExtension = LANGUAGE_EXTENSION_MAP[language];
		return [
			EditorState.readOnly.of(true),
			EditorView.editable.of(false),
			EditorView.lineWrapping,
			...(langExtension ? [langExtension] : []),
		];
	}, [language]);

	const handleCopy = useCallback((): void => {
		navigator.clipboard.writeText(value).then(() => {
			setIsCopied(true);
			onCopy?.(value);
			setTimeout(() => setIsCopied(false), 2000);
		});
	}, [value, onCopy]);

	return (
		<div className={cx('code-block-container', className)}>
			{showCopyButton && (
				<Button
					variant="solid"
					size="xs"
					color="secondary"
					className={cx('code-block-copy-btn', { copied: isCopied })}
					onClick={handleCopy}
					aria-label={isCopied ? 'Copied' : 'Copy code'}
					title={isCopied ? 'Copied' : 'Copy code'}
				>
					{isCopied ? <CheckOutlined /> : <CopyOutlined />}
				</Button>
			)}
			<CodeMirror
				className="code-block-editor"
				value={value}
				theme={theme}
				readOnly
				editable={false}
				extensions={extensions}
				basicSetup={{
					lineNumbers,
					highlightActiveLineGutter: false,
					highlightActiveLine: false,
					highlightSelectionMatches: true,
					drawSelection: true,
					syntaxHighlighting: true,
					bracketMatching: true,
					history: false,
					foldGutter: false,
					autocompletion: false,
					defaultKeymap: false,
					searchKeymap: true,
					historyKeymap: false,
					foldKeymap: false,
					completionKeymap: false,
					closeBrackets: false,
					indentOnInput: false,
				}}
				style={{
					maxHeight: maxHeight ?? 'auto',
				}}
			/>
		</div>
	);
}

export default CodeBlock;
