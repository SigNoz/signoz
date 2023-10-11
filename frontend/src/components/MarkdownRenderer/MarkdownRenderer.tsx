/* eslint-disable no-restricted-syntax */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import ReactMarkdown from 'react-markdown';
import { CodeProps } from 'react-markdown/lib/ast-to-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import CodeCopyBtn from './CodeCopyBtn/CodeCopyBtn';

interface LinkProps {
	href: string;
	children: React.ReactElement;
}

function Pre({ children }: { children: React.ReactNode }): JSX.Element {
	return (
		<pre className="code-snippet-container">
			<CodeCopyBtn>{children}</CodeCopyBtn>
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

function MarkdownRenderer({
	markdownContent,
	variables,
}: {
	markdownContent: any;
	variables: any;
}): JSX.Element {
	const interpolatedMarkdown = interpolateMarkdown(markdownContent, variables);

	return (
		<ReactMarkdown
			components={{
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				a: Link,
				pre: Pre,
				code: Code,
			}}
		>
			{interpolatedMarkdown}
		</ReactMarkdown>
	);
}

export { Code, Link, MarkdownRenderer, Pre };
