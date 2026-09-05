import { type ReactNode, useMemo } from 'react';
import cx from 'classnames';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import CodeBlock from './CodeBlock';

import styles from './MarkdownContent.module.scss';

/**
 * SECURITY — never add `rehype-raw` here. Without it react-markdown renders raw HTML
 * as plain text, so there is no `dangerouslySetInnerHTML` on the path and nothing to
 * sanitise. The body is user-authored and, on a public dashboard, read anonymously;
 * the shared `MarkdownRenderer` enables `rehype-raw` and is safe only for the trusted
 * content it was built for. `transformLinkUri` is likewise left at its default.
 */
const REMARK_PLUGINS = [remarkGfm];

// What the default transformer substitutes for a rejected scheme. Inert, but it
// would still put `javascript:` in the DOM, so the anchor is dropped instead.
const REJECTED_HREF = `javascript:${'void(0)'}`;

const COMPONENTS: Components = {
	a: ({ node: _node, children, href, ...props }): JSX.Element => {
		if (!href || href === REJECTED_HREF) {
			return <span {...props}>{children}</span>;
		}
		return (
			<a {...props} href={href} target="_blank" rel="noopener noreferrer nofollow">
				{children}
			</a>
		);
	},
	// Wide tables scroll inside their own box rather than widening the panel.
	table: ({ node: _node, children, ...props }): JSX.Element => (
		<div className={styles.tableScroll}>
			<table {...props}>{children}</table>
		</div>
	),
	code: CodeBlock,
	// `CodeBlock` emits its own `pre`, so this one would nest a second one.
	pre: ({ children }): JSX.Element => <>{children}</>,
};

export interface MarkdownContentProps {
	/** Variable interpolation happens upstream, before parsing. */
	children: string;
	/** Rendered instead of the body when the source is blank. */
	emptyState?: ReactNode;
	className?: string;
	testId?: string;
}

/** CommonMark + GFM, styled in isolation — see the reset in the SCSS module. */
function MarkdownContent({
	children,
	emptyState = null,
	className,
	testId = 'markdown-content',
}: MarkdownContentProps): JSX.Element | null {
	// Dashboards re-render on every variable tick; parsing is the expensive half.
	const body = useMemo(
		() =>
			children.trim() ? (
				<ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
					{children}
				</ReactMarkdown>
			) : null,
		[children],
	);

	if (!body) {
		return emptyState ? <>{emptyState}</> : null;
	}

	return (
		<div className={cx(styles.content, className)} data-testid={testId}>
			{body}
		</div>
	);
}

export default MarkdownContent;
