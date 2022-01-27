import React, { useEffect, useRef } from 'react';
import { Typography, Divider, Button, Row } from 'antd';
import * as monaco from 'monaco-editor';
const { Paragraph } = Typography;
import { Container, MonocoEditor } from './styles';

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
		<Container>
			<Row align="middle" justify="space-between">
				<Paragraph ellipsis>
					Something got messed up due to: {error.message}
				</Paragraph>

				<Button
					onClick={() => {
						window.location.reload();
					}}
				>
					Reload
				</Button>
			</Row>

			<Divider />

			<Typography>Stack Trace:</Typography>

			<MonocoEditor ref={divEl}></MonocoEditor>
		</Container>
	);
};

interface ErrorProps {
	error: Error;
	errorInfo: React.ErrorInfo;
}

export default Error;
