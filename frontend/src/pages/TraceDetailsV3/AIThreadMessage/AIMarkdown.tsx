import ReactMarkdown, { uriTransformer } from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Model output is untrusted: never add `rehype-raw`, so raw HTML renders as text.
const MD_PLUGINS = [remarkGfm];
const MD_COMPONENTS: Components = {
	a: ({ node: _node, children, ...props }): JSX.Element => (
		<a {...props} target="_blank" rel="noopener noreferrer">
			{children}
		</a>
	),
	// Images become links so viewing a message never fetches a third-party URL.
	img: ({ src, alt }): JSX.Element => (
		<a href={src} target="_blank" rel="noopener noreferrer">
			{alt || src}
		</a>
	),
};

interface AIMarkdownProps {
	content: string;
	className?: string;
}

function AIMarkdown({ content, className }: AIMarkdownProps): JSX.Element {
	return (
		<ReactMarkdown
			className={className}
			remarkPlugins={MD_PLUGINS}
			// Images render as links, so their URIs need the same sanitising links get.
			transformImageUri={uriTransformer}
			components={MD_COMPONENTS}
		>
			{content}
		</ReactMarkdown>
	);
}

AIMarkdown.defaultProps = {
	className: undefined,
};

export default AIMarkdown;
