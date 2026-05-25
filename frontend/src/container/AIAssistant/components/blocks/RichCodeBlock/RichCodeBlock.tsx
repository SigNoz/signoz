import React, { useEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Button } from '@signozhq/ui/button';
import { Check, Copy } from '@signozhq/icons';
import SyntaxHighlighter, {
	a11yDark,
	oneLight,
} from 'components/MarkdownRenderer/syntaxHighlighter';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { BlockRegistry } from '../BlockRegistry';

import styles from './RichCodeBlock.module.scss';

interface CodeProps {
	className?: string;
	children?: React.ReactNode;
	// react-markdown passes `node` — accept and ignore it
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	node?: any;
}

/**
 * Drop-in replacement for react-markdown's `code` renderer.
 *
 * - ```ai-<type>``` blocks resolve to a registered block component.
 * - Other fenced blocks with a language tag get Prism syntax highlighting via
 *   the shared `react-syntax-highlighter` setup (a11y-dark theme). Languages
 *   outside the registered set fall through to plain text — same behaviour as
 *   the rest of the app.
 * - Inline code (no `language-X` class) stays as a bare <code>.
 *
 * The wrapping <pre> that react-markdown emits for fenced blocks is unwrapped
 * by `SmartPre` whenever this returns something other than a literal <code>,
 * so we don't end up with nested <pre><pre>.
 */
export default function RichCodeBlock({
	className,
	children,
}: CodeProps): JSX.Element {
	const lang = /language-(\S+)/.exec(className ?? '')?.[1];

	if (lang?.startsWith('ai-')) {
		const blockType = lang.slice(3); // strip the 'ai-' prefix
		const BlockComp = BlockRegistry.get(blockType);

		if (BlockComp) {
			const raw = String(children ?? '').trim();
			try {
				const parsedData = JSON.parse(raw);
				return <BlockComp data={parsedData} />;
			} catch {
				// Invalid JSON — fall through and render as a code block
			}
		}
	}

	return <FencedCode lang={lang}>{children}</FencedCode>;
}

interface FencedCodeProps {
	lang: string | undefined;
	children: React.ReactNode;
	className?: string;
}

function FencedCode({
	lang,
	children,
	className,
}: FencedCodeProps): JSX.Element {
	const isDark = useIsDarkMode();

	if (!lang) {
		return <code className={className}>{children}</code>;
	}

	const code = String(children ?? '').replace(/\n$/, '');
	return (
		<div className={styles.codeBlock}>
			<CopyButton text={code} />
			<SyntaxHighlighter
				language={lang}
				// Theme tokens (foreground colors for keywords, strings, etc.)
				// flip with the app theme so they remain readable.
				style={isDark ? a11yDark : oneLight}
				// Defer the background to our theme tokens via SCSS so the block
				// blends with the surrounding chat surface in both modes; also
				// trim the default padding (Prism themes ship with 1em).
				customStyle={{
					margin: 0,
					padding: 0,
					background: 'transparent',
					fontSize: '12px',
				}}
			>
				{code}
			</SyntaxHighlighter>
		</div>
	);
}

function CopyButton({ text }: { text: string }): JSX.Element {
	const [copied, setCopied] = useState(false);
	const [, copyToClipboard] = useCopyToClipboard();
	// Track the timeout so a rapid re-click resets the 1.5s window and an
	// unmount mid-flight doesn't try to setState on a dead component.
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => (): void => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		},
		[],
	);

	const handleCopy = (): void => {
		copyToClipboard(text);
		setCopied(true);
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = setTimeout(() => setCopied(false), 1500);
	};

	return (
		<Button
			variant="ghost"
			size="sm"
			color="secondary"
			className={styles.copyBtn}
			onClick={handleCopy}
			title={copied ? 'Copied' : 'Copy code'}
			aria-label={copied ? 'Copied' : 'Copy code'}
		>
			{copied ? <Check size={12} /> : <Copy size={12} />}
		</Button>
	);
}
