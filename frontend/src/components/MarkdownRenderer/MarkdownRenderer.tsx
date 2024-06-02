/* eslint-disable no-restricted-syntax */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import useAnalytics from 'hooks/analytics/useAnalytics';
import { isEmpty } from 'lodash-es';
import ReactMarkdown from 'react-markdown';
import { CodeProps } from 'react-markdown/lib/ast-to-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import rehypeRaw from 'rehype-raw';

import CodeCopyBtn from './CodeCopyBtn/CodeCopyBtn';

interface LinkProps {
	href: string;
	children: React.ReactElement;
}

function Pre({
	children,
	elementDetails,
}: {
	children: React.ReactNode;
	elementDetails: Record<string, unknown>;
}): JSX.Element {
	const { trackEvent } = useAnalytics();

	const { trackingTitle = '', ...rest } = elementDetails;

	const handleClick = (additionalInfo?: Record<string, unknown>): void => {
		console.log('Tracking title -', trackingTitle);
		const trackingData = { ...rest, copiedContent: additionalInfo };
		trackEvent(
			isEmpty(trackingTitle) ? 'Copy btn event' : trackingTitle,
			trackingData,
		);
	};

	return (
		<pre className="code-snippet-container">
			<CodeCopyBtn onCopyClick={handleClick}>{children}</CodeCopyBtn>
			{children}
		</pre>
	);
}

function Code({
	node,
	inline,
	className = 'blog-code',
	children,
	...props
}: CodeProps): JSX.Element {
	const match = /language-(\w+)/.exec(className || '');
	return !inline && match ? (
		<SyntaxHighlighter
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
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
	elementDetails,
}: {
	markdownContent: any;
	variables: any;
	elementDetails?: Record<string, unknown>;
}): JSX.Element {
	const interpolatedMarkdown = interpolateMarkdown(markdownContent, variables);

	return (
		<ReactMarkdown
			rehypePlugins={[rehypeRaw as any]}
			components={{
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				a: Link,
				pre: ({ children }) =>
					Pre({ children, elementDetails: elementDetails ?? {} }),
				code: Code,
				customtag: CustomTag,
			}}
		>
			{interpolatedMarkdown}
		</ReactMarkdown>
	);
}

MarkdownRenderer.defaultProps = {
	elementDetails: {},
};

export { Code, Link, MarkdownRenderer, Pre };
