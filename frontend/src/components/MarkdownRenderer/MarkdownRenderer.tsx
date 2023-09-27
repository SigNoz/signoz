/* eslint-disable react/jsx-props-no-spreading */
import { CodeProps } from 'react-markdown/lib/ast-to-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import CodeCopyBtn from './CodeCopyBtn/CodeCopyBtn';

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

export { Code, Pre };
