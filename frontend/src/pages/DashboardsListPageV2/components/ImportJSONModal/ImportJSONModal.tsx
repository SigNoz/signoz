import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath } from 'react-router-dom';
import { red } from '@ant-design/colors';
import MEditor, { Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Button, Flex, Modal, Upload, UploadProps } from 'antd';
import { toast } from '@signozhq/ui/sonner';
import { Typography } from '@signozhq/ui/typography';
import {
	CircleAlert,
	ExternalLink,
	Github,
	MonitorDot,
	MoveRight,
	Sparkles,
} from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import { createDashboardV2 } from 'api/generated/services/dashboard';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import sampleDashboard from './sampleDashboard.json';

import styles from './ImportJSONModal.module.scss';
import { normalizeToPostable } from './ImportJSONModalUtils';

interface Props {
	open: boolean;
	onClose: () => void;
}

function ImportJSONModal({ open, onClose }: Props): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { t } = useTranslation(['dashboard', 'common']);
	const [isUploadError, setIsUploadError] = useState(false);
	const [isCreateError, setIsCreateError] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [editorValue, setEditorValue] = useState('');

	const { showErrorModal } = useErrorModal();
	const isDarkMode = useIsDarkMode();

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
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: response.data.id }),
			);
			logEvent('Dashboard List V2: New dashboard imported successfully', {
				dashboardId: response.data?.id,
			});
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

	const handleClose = (): void => {
		setIsUploadError(false);
		setIsCreateError(false);
		onClose();
	};

	const setEditorTheme = (monaco: Monaco): void => {
		monaco.editor.defineTheme('my-theme', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'string.key.json', foreground: Color.BG_VANILLA_400 },
				{ token: 'string.value.json', foreground: Color.BG_ROBIN_400 },
			],
			colors: { 'editor.background': Color.BG_INK_300 },
		});
	};

	const renderError = (msg: string): JSX.Element => (
		<div className={styles.jsonError}>
			<CircleAlert size="md" color={red[7]} />
			<Typography className={styles.errorText}>{msg}</Typography>
		</div>
	);

	return (
		<Modal
			wrapClassName="importJsonModalWrapper"
			open={open}
			centered
			closable
			keyboard
			maskClosable
			onCancel={handleClose}
			destroyOnClose
			width="60vw"
			footer={
				<div className={styles.footer}>
					{isCreateError && renderError(t('error_loading_json'))}
					{isUploadError && renderError(t('error_upload_json'))}

					<div className={styles.actions}>
						<Flex gap="small">
							<Upload
								accept=".json"
								showUploadList={false}
								multiple={false}
								onChange={handleUpload}
								beforeUpload={(): boolean => false}
								action="none"
							>
								<Button
									type="default"
									className="periscope-btn"
									icon={<MonitorDot size={14} />}
									onClick={(): void => {
										logEvent('Dashboard List V2: Upload JSON file clicked', {});
									}}
								>
									{t('upload_json_file')}
								</Button>
							</Upload>
							<Button
								type="default"
								className="periscope-btn"
								icon={<Sparkles size={14} />}
								onClick={(): void => {
									setEditorValue(JSON.stringify(sampleDashboard, null, 2));
									setIsUploadError(false);
									logEvent('Dashboard List V2: Load sample clicked', {});
								}}
							>
								Load sample
							</Button>
							<a
								href="https://signoz.io/docs/dashboards/dashboard-templates/overview/"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Button
									type="default"
									className="periscope-btn"
									icon={<Github size={14} />}
								>
									{t('view_template')}&nbsp;
									<ExternalLink size={14} />
								</Button>
							</a>
						</Flex>

						<Button
							onClick={handleImport}
							loading={isCreating}
							className="periscope-btn primary"
							type="primary"
						>
							{t('import_and_next')} &nbsp; <MoveRight size={14} />
						</Button>
					</div>
				</div>
			}
		>
			<div className={styles.contentContainer}>
				<div className={styles.contentHeader}>
					<Typography.Text>{t('import_json')}</Typography.Text>
				</div>
				<MEditor
					language="json"
					height="40vh"
					onChange={(newValue): void => setEditorValue(newValue || '')}
					value={editorValue}
					options={{
						scrollbar: { alwaysConsumeMouseWheel: false },
						minimap: { enabled: false },
						fontSize: 14,
						fontFamily: 'Space Mono',
					}}
					theme={isDarkMode ? 'my-theme' : 'light'}
					onMount={(_, monaco): void => {
						document.fonts.ready.then(() => {
							monaco.editor.remeasureFonts();
						});
					}}
					beforeMount={setEditorTheme}
				/>
			</div>
		</Modal>
	);
}

export default ImportJSONModal;
