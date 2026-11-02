import { useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Check, Copy } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
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
				<div className={styles.copyButton}>
					<Tooltip title={isCopied ? 'Copied' : 'Copy'}>
						<Button
							variant="ghost"
							color="secondary"
							size="sm"
							icon
							onClick={handleCopy}
							aria-label="Copy code"
						>
							{isCopied ? <Check size={14} /> : <Copy size={14} />}
						</Button>
					</Tooltip>
				</div>
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
