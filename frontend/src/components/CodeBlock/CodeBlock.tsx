import { useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Check, Copy } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import SyntaxHighlighter, {
	a11yDark,
} from 'components/MarkdownRenderer/syntaxHighlighter';

import styles from './CodeBlock.module.scss';

export interface CodeBlockProps {
	code: string;
	language?: string;
	className?: string;
	inline?: boolean;
	showLineNumbers?: boolean;
	showCopyButton?: boolean;
	onCopy?: (copiedCode: string) => void;
}

function CodeBlock({
	code,
	language = 'text',
	className,
	inline = false,
	showLineNumbers = false,
	showCopyButton = true,
	onCopy,
}: CodeBlockProps): JSX.Element {
	const [isCopied, setIsCopied] = useState(false);
	const [, copyToClipboard] = useCopyToClipboard();
	const normalizedCode = useMemo(() => code?.replace(/\n$/, '') ?? '', [code]);

	const handleCopy = (): void => {
		copyToClipboard(normalizedCode);
		setIsCopied(true);
		onCopy?.(normalizedCode);

		setTimeout(() => {
			setIsCopied(false);
		}, 1000);
	};

	if (inline) {
		return <code className={className}>{normalizedCode}</code>;
	}

	return (
		<div
			className={`${styles.codeBlock} ${className}`}
			style={{ position: 'relative' }}
			data-testid="code-block-container"
		>
			{showCopyButton ? (
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					onClick={handleCopy}
					prefix={isCopied ? <Check size={14} /> : <Copy size={14} />}
					aria-label="Copy code"
					title={isCopied ? 'Copied' : 'Copy'}
					style={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}
				/>
			) : null}
			<SyntaxHighlighter
				style={a11yDark}
				language={language}
				PreTag="div"
				showLineNumbers={showLineNumbers}
				wrapLongLines
				className={styles.codeBlockSyntaxHighlighter}
			>
				{normalizedCode}
			</SyntaxHighlighter>
		</div>
	);
}

CodeBlock.defaultProps = {
	language: 'text',
	className: undefined,
	inline: false,
	showLineNumbers: false,
	showCopyButton: true,
	onCopy: undefined,
};

export default CodeBlock;
