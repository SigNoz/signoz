import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath } from 'react-router-dom';
import { red } from '@ant-design/colors';
// eslint-disable-next-line signoz/no-antd-components -- Upload has no @signozhq/ui equivalent yet
import { Upload, UploadProps } from 'antd';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import { Typography } from '@signozhq/ui/typography';
import { CircleAlert, MonitorDot, MoveRight } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import { createDashboardV2 } from 'api/generated/services/dashboard';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { normalizeToPostable } from './importUtils';
import JsonEditor from './JsonEditor';

import styles from './NewDashboardModal.module.scss';

interface Props {
	onClose: () => void;
}

function ImportJsonPanel({ onClose }: Props): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { t } = useTranslation(['dashboard', 'common']);
	const { showErrorModal } = useErrorModal();

	const [editorValue, setEditorValue] = useState('');
	const [isUploadError, setIsUploadError] = useState(false);
	const [isCreateError, setIsCreateError] = useState(false);
	const [isCreating, setIsCreating] = useState(false);

	const handleUpload: UploadProps['onChange'] = (info) => {
		const lastFile = info.fileList[info.fileList.length - 1];
		if (!lastFile?.originFileObj) {
			return;
		}
		const reader = new FileReader();
		reader.onload = (event): void => {
			try {
				const target = event.target?.result;
				if (!target) {
					return;
				}
				const parsed = JSON.parse(target.toString());
				setEditorValue(JSON.stringify(parsed, null, 2));
				setIsUploadError(false);
			} catch {
				setIsUploadError(true);
			}
		};
		reader.readAsText(lastFile.originFileObj);
	};

	const handleImport = async (): Promise<void> => {
		try {
			setIsCreating(true);
			logEvent('Dashboard List V2: Import and next clicked', {});
			const parsed = JSON.parse(editorValue) as Record<string, unknown>;
			const payload = normalizeToPostable(parsed);
			const response = await createDashboardV2(payload);
			onClose();
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: response.data.id }),
			);
		} catch (error) {
			showErrorModal(error as APIError);
			setIsCreateError(true);
			toast.error(
				error instanceof Error ? error.message : t('error_loading_json'),
			);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<div className={styles.panel}>
			<Typography.Text className={styles.importHeader}>
				{t('import_json')}
			</Typography.Text>

			<JsonEditor value={editorValue} onChange={setEditorValue} height="280px" />

			{(isCreateError || isUploadError) && (
				<div className={styles.jsonError}>
					<CircleAlert size="md" color={red[7]} />
					<Typography className={styles.errorText}>
						{isUploadError ? t('error_upload_json') : t('error_loading_json')}
					</Typography>
				</div>
			)}

			<div className={styles.importFooter}>
				<Upload
					accept=".json"
					showUploadList={false}
					multiple={false}
					onChange={handleUpload}
					beforeUpload={(): boolean => false}
					action="none"
				>
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						prefix={<MonitorDot size={14} />}
						testId="upload-json-file"
						onClick={(): void => {
							logEvent('Dashboard List V2: Upload JSON file clicked', {});
						}}
					>
						{t('upload_json_file')}
					</Button>
				</Upload>

				<Button
					variant="solid"
					color="primary"
					size="md"
					loading={isCreating}
					suffix={<MoveRight size={14} />}
					testId="import-json-submit"
					onClick={handleImport}
				>
					{t('import_and_next')}
				</Button>
			</div>
		</div>
	);
}

export default ImportJsonPanel;
