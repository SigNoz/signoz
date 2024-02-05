import './styles.scss';

import { ImportOutlined } from '@ant-design/icons';
import { Monaco } from '@monaco-editor/react';
import { Button, Modal } from 'antd';
import Editor from 'components/Editor';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PipelinesJSONSchema } from '../schema';

export default function PipelinesImportModal({
	open,
	onCancel,
}: PipelinesImportModalProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const [pipelinesJson, setPipelinesJson] = useState('');
	const [editorErrors, setEditorErrors] = useState<string[]>([]);
	const isEmpty = pipelinesJson.trim().length < 1;
	const isInvalid = (editorErrors || []).length > 0;

	const firstError = editorErrors?.[0];
	const footer = useMemo(
		() => (
			<div className="pipelines-import-modal-footer">
				<div className="pipelines-import-modal-error">{firstError || ''}</div>
				<Button
					disabled={isEmpty || isInvalid}
					type="primary"
					size="small"
					onClick={(): void => {}}
				>
					<ImportOutlined /> {t('import')}
				</Button>
			</div>
		),
		[t, isEmpty, isInvalid, firstError],
	);

	return (
		<Modal
			open={open}
			onCancel={onCancel}
			width="80vw"
			centered
			title={t('import')}
			destroyOnClose
			footer={footer}
		>
			<Editor
				height="70vh"
				onChange={(value): void => setPipelinesJson(value)}
				value={pipelinesJson}
				language="json"
				beforeMount={(monaco: Monaco): void => {
					monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
						validate: true,
						schemas: [
							{
								fileMatch: ['*'],
								schema: PipelinesJSONSchema,
							},
						],
					});
				}}
				onValidate={(markers): void =>
					setEditorErrors(
						markers.map(
							(m) => `Ln ${m.startLineNumber}, Col ${m.startColumn}: ${m.message}`,
						),
					)
				}
			/>
		</Modal>
	);
}

interface PipelinesImportModalProps {
	open: boolean;
	onCancel: VoidFunction;
}
