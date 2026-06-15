import type { ComponentProps } from 'react';

type MarkdownExternalLinkProps = ComponentProps<'a'> & {
	// react-markdown passes `node` — accept and ignore it
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	node?: any;
};

export default function MarkdownExternalLink({
	href,
	children,
	node: _node,
	...props
}: MarkdownExternalLinkProps): JSX.Element {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			data-testid="ai-markdown-link"
			{...props}
		>
			{children}
		</a>
	);
}
