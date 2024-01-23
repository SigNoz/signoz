import { CopyFilled, DownloadOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import Editor from 'components/Editor';
import { downloadObjectAsJson } from 'container/NewDashboard/DashboardDescription/utils';
import { useNotifications } from 'hooks/useNotifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import { PipelineData } from 'types/api/pipeline/def';

export default function PipelinesExportModal({
	open,
	onCancel,
	pipelines,
}: PipelinesExportModalProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const pipelinesPropJson = JSON.stringify(pipelines, null, 2);
	const [pipelinesJson, setPipelinesJson] = useState(pipelinesPropJson);
	useEffect(() => {
		setPipelinesJson(pipelinesPropJson);
	}, [open, pipelinesPropJson]);

	const { notifications } = useNotifications();
	const [clipboardContent, setClipboardContent] = useCopyToClipboard();
	useEffect(() => {
		if (clipboardContent.error) {
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}

		if (clipboardContent.value) {
			notifications.success({
				message: t('success', {
					ns: 'common',
				}),
			});
		}
	}, [clipboardContent.error, clipboardContent.value, t, notifications]);

	const footer = useMemo(
		() => (
			<>
				<Button
					style={{
						marginTop: '16px',
					}}
					onClick={(): void => setClipboardContent(pipelinesJson)}
					type="primary"
					size="small"
				>
					<CopyFilled /> {t('copy_to_clipboard')}
				</Button>

				<Button
					type="primary"
					size="small"
					onClick={(): void => {
						downloadObjectAsJson(JSON.parse(pipelinesJson), 'pipelines');
					}}
				>
					<DownloadOutlined /> {t('download_json')}
				</Button>
			</>
		),
		[pipelinesJson, t, setClipboardContent],
	);

	return (
		<Modal
			open={open}
			onCancel={onCancel}
			width="80vw"
			centered
			title={t('share')}
			destroyOnClose
			footer={footer}
		>
			<Editor
				height="70vh"
				onChange={(value): void => setPipelinesJson(value)}
				value={pipelinesJson}
			/>
		</Modal>
	);
}

interface PipelinesExportModalProps {
	open: boolean;
	onCancel: VoidFunction;
	pipelines: Array<PipelineData>;
}
