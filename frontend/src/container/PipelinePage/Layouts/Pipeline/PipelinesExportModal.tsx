import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

export default function PipelinesExportModal({
	open,
	onCancel,
}: PipelinesExportModalProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	return (
		<Modal
			open={open}
			onCancel={onCancel}
			width="80vw"
			centered
			title={t('share')}
			okText={t('download_json')}
			cancelText={t('cancel')}
			destroyOnClose
		>
			Hello World
		</Modal>
	);
}

interface PipelinesExportModalProps {
	open: boolean;
	onCancel: VoidFunction;
}
