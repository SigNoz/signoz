import { Button, Typography, Upload } from 'antd';
import Editor from 'components/Editor';
import React, { useRef, useState } from 'react';

import { EditorContainer } from './styles';

function ImportJSON(): JSX.Element {
	const [jsonData, setJsonData] = useState<Record<string, unknown>>();

	const value = useRef<string>('');

	return (
		<div>
			<Upload
				accept=".json"
				showUploadList={false}
				multiple={false}
				onChange={async (info): Promise<void> => {
					const { fileList } = info;
					const reader = new FileReader();

					if (fileList[0].originFileObj) {
						reader.onload = async (event): Promise<void> => {
							if (event.target) {
								const target = event.target.result;

								console.log(target);
							}
						};

						reader.readAsDataURL(fileList[0].originFileObj);
					}
				}}
				beforeUpload={(): boolean => false}
				action="none"
				data={jsonData}
			>
				<Button type="primary">Upload JSON file</Button>
			</Upload>

			<EditorContainer>
				<Typography.Paragraph>Paste JSON below</Typography.Paragraph>
				<Editor value={value} language="json" />
			</EditorContainer>
		</div>
	);
}

export default ImportJSON;
