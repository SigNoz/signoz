import type { CodeProps } from 'react-markdown/lib/ast-to-react';

import CopyButton from 'periscope/components/CopyButton/CopyButton';

import SyntaxHighlighter, { resolveLanguage } from './syntaxLanguages';
import { usePrismLanguage } from './usePrismLanguage';

import styles from './CodeBlock.module.scss';

const LANGUAGE_PATTERN = /language-(\w+)/;

/**
 * Fenced blocks are tokenised by Prism but coloured by the SCSS module —
 * `useInlineStyles` off swaps the library's own theme for `token …` class names,
 * which keeps the palette on design tokens and themed with the rest of the body.
 */
function CodeBlock({ inline, className, children }: CodeProps): JSX.Element {
	const fenced = LANGUAGE_PATTERN.exec(className ?? '')?.[1]?.toLowerCase();
	const language = fenced ? resolveLanguage(fenced) : null;
	const isReady = usePrismLanguage(language);

	if (inline) {
		return <code className={className}>{children}</code>;
	}

	// react-markdown hands the block's text through as string children; anything
	// else in there is not source and has no place in the highlighter's input —
	// and it is exactly what the copy button puts on the clipboard.
	const source = (Array.isArray(children) ? children : [children])
		.filter((child): child is string => typeof child === 'string')
		.join('')
		.replace(/\n$/, '');

	// Verbatim while the language chunk is still loading, and permanently for one
	// Prism doesn't know. The `pre` is supplied here either way, since
	// `MarkdownContent` unwraps react-markdown's own.
	const block =
		!language || !isReady ? (
			<pre>
				<code className={className}>{children}</code>
			</pre>
		) : (
			<SyntaxHighlighter
				language={language}
				useInlineStyles={false}
				PreTag="pre"
				CodeTag="code"
			>
				{source}
			</SyntaxHighlighter>
		);

	return (
		<div className={styles.codeBlock}>
			{block}
			{/* data-md-ui: exempts the design-system button from the body's style reset. */}
			<span data-md-ui className={styles.copyButton}>
				<CopyButton
					value={source}
					size={13}
					ariaLabel="Copy code"
					testId="text-panel-copy-code"
				/>
			</span>
		</div>
	);
}

export default CodeBlock;
