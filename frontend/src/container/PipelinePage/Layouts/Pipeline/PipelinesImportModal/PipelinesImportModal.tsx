import './styles.scss';

import { ImportOutlined } from '@ant-design/icons';
import { Monaco } from '@monaco-editor/react';
import { Button, Modal } from 'antd';
import Editor from 'components/Editor';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PipelineData } from 'types/api/pipeline/def';

import { PipelinesJSONSchema } from '../schema';

export default function PipelinesImportModal({
	open,
	onClose,
	setCurrentPipelines,
}: PipelinesImportModalProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const [pipelinesJson, setPipelinesJson] = useState('');
	const [editorErrors, setEditorErrors] = useState<string[]>([]);
	const isEmpty = pipelinesJson.trim().length < 1;
	const isInvalid = (editorErrors || []).length > 0;

	const firstError = editorErrors?.[0];
	const onImport = useCallback((): void => {
		try {
			const pipelines = JSON.parse(pipelinesJson);
			setCurrentPipelines(pipelines);
			onClose();
		} catch (error) {
			setEditorErrors([String(error)]);
		}
	}, [pipelinesJson, setCurrentPipelines, onClose]);
	const footer = useMemo(
		() => (
			<div className="pipelines-import-modal-footer">
				<div className="pipelines-import-modal-error">{firstError || ''}</div>
				<Button
					disabled={isEmpty || isInvalid}
					type="primary"
					size="small"
					onClick={onImport}
				>
					<ImportOutlined /> {t('import')}
				</Button>
			</div>
		),
		[t, isEmpty, isInvalid, firstError, onImport],
	);

	return (
		<Modal
			open={open}
			onCancel={onClose}
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
	onClose: VoidFunction;
	setCurrentPipelines: (
		value: React.SetStateAction<Array<PipelineData>>,
	) => void;
}
