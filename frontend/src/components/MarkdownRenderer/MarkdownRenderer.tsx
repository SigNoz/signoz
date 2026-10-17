/* eslint-disable @typescript-eslint/explicit-function-return-type */

import ReactMarkdown from 'react-markdown';
import { CodeProps } from 'react-markdown/lib/ast-to-react';
import logEvent from 'api/common/logEvent';
import { isEmpty } from 'lodash-es';
import rehypeRaw from 'rehype-raw';

import CodeCopyBtn from './CodeCopyBtn/CodeCopyBtn';
import SyntaxHighlighter, { a11yDark } from './syntaxHighlighter';

interface LinkProps {
	href: string;
	children: React.ReactElement;
}

function Pre({
	children,
	elementDetails,
	trackCopyAction,
}: {
	children: React.ReactNode;
	trackCopyAction: boolean;
	elementDetails: Record<string, unknown>;
}): JSX.Element {
	const { trackingTitle = '', ...rest } = elementDetails;

	const handleClick = (additionalInfo?: Record<string, unknown>): void => {
		const trackingData = { ...rest, copiedContent: additionalInfo };

		if (trackCopyAction && !isEmpty(trackingTitle)) {
			logEvent(trackingTitle as string, trackingData);
		}
	};

	return (
		<pre className="code-snippet-container">
			<CodeCopyBtn onCopyClick={handleClick}>{children}</CodeCopyBtn>
			{children}
		</pre>
	);
}

function Code({
	inline,
	className = 'blog-code',
	children,
	...props
}: CodeProps): JSX.Element {
	const match = /language-(\w+)/.exec(className || '');
	return !inline && match ? (
		<SyntaxHighlighter
			// @ts-expect-error
			style={a11yDark}
			language={match[1]}
			PreTag="div"
			{...props}
		>
			{String(children).replace(/\n$/, '')}
		</SyntaxHighlighter>
	) : (
		<code className={className} {...props}>
			{children}
		</code>
	);
}

// Untrusted images become links so viewing a message never fetches a third-party URL.
function ImageAsLink({
	src,
	alt,
}: {
	src?: string;
	alt?: string;
}): JSX.Element {
	return (
		<a href={src} target="_blank" rel="noopener noreferrer">
			{alt || src}
		</a>
	);
}

function Link({ href, children }: LinkProps): JSX.Element {
	return (
		<a href={href} target="_blank" rel="noopener noreferrer">
			{children}
		</a>
	);
}

const interpolateMarkdown = (
	markdownContent: any,
	variables: { [s: string]: unknown } | ArrayLike<unknown>,
) => {
	let interpolatedContent = markdownContent;

	const variableEntries = Object.entries(variables);

	// Loop through variables and replace placeholders with values
	for (const [key, value] of variableEntries) {
		const placeholder = `{{${key}}}`;
		const regex = new RegExp(placeholder, 'g');
		interpolatedContent = interpolatedContent.replace(regex, value);
	}

	return interpolatedContent;
};

function CustomTag({ color }: { color: string }): JSX.Element {
	return <h1 style={{ color }}>This is custom element</h1>;
}

function MarkdownRenderer({
	markdownContent,
	variables,
	trackCopyAction,
	elementDetails,
	className,
	isTrusted = true,
}: {
	markdownContent: any;
	variables: any;
	trackCopyAction?: boolean;
	elementDetails?: Record<string, unknown>;
	className?: string;
	// False for untrusted content (e.g. telemetry): HTML renders as text, images as links.
	isTrusted?: boolean;
}): JSX.Element {
	const interpolatedMarkdown = interpolateMarkdown(markdownContent, variables);

	return (
		<ReactMarkdown
			className={className}
			rehypePlugins={isTrusted ? [rehypeRaw as any] : []}
			components={{
				// @ts-expect-error
				a: Link,
				pre: ({ children }) =>
					Pre({
						children,
						elementDetails: elementDetails ?? {},
						trackCopyAction: !!trackCopyAction,
					}),
				code: Code,
				customtag: CustomTag,
				...(isTrusted ? {} : { img: ImageAsLink }),
			}}
		>
			{interpolatedMarkdown}
		</ReactMarkdown>
	);
}

MarkdownRenderer.defaultProps = {
	elementDetails: {},
	trackCopyAction: false,
	isTrusted: true,
};

export { Code, Link, MarkdownRenderer, Pre };
