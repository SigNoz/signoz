import React, { useEffect, useRef } from 'react';
import { Card, Typography, Divider } from 'antd';
import * as monaco from 'monaco-editor';
import { ErrorContainer } from './styles';

const Error = ({ error, errorInfo }: ErrorProps) => {
	const divEl = useRef<HTMLDivElement>(null);
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

	useEffect(() => {
		let editor = editorRef.current;

		if (divEl.current) {
			editor = monaco.editor.create(divEl.current, {
				value: errorInfo.componentStack,
				useShadowDOM: true,
				theme: 'vs-dark',
				automaticLayout: true,
				fontSize: 16,
				minimap: {
					enabled: false,
				},
				language: 'json',
				readOnly: true,
			});
		}
	}, []);

	return (
		<Card>
			<Typography>Something got messed up due to: {error.message}</Typography>

			<Divider />

			<Typography>Stack Trace:</Typography>

			<ErrorContainer ref={divEl}></ErrorContainer>
		</Card>
	);
};

interface ErrorProps {
	error: Error;
	errorInfo: React.ErrorInfo;
}

export default Error;
