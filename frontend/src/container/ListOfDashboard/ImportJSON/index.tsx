import './importJSON.styles.scss';

import { red } from '@ant-design/colors';
import { ExclamationCircleTwoTone } from '@ant-design/icons';
import MEditor, { Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Button, Modal, Space, Typography, Upload, UploadProps } from 'antd';
import createDashboard from 'api/dashboard/create';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { MESSAGE } from 'hooks/useFeatureFlag';
import { useNotifications } from 'hooks/useNotifications';
import { getUpdatedLayout } from 'lib/dashboard/getUpdatedLayout';
import history from 'lib/history';
import { MonitorDot, MoveRight, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath } from 'react-router-dom';
import { DashboardData } from 'types/api/dashboard/getAll';

function ImportJSON({
	isImportJSONModalVisible,
	uploadedGrafana,
	onModalHandler,
}: ImportJSONProps): JSX.Element {
	const [jsonData, setJsonData] = useState<Record<string, unknown>>();
	const { t } = useTranslation(['dashboard', 'common']);
	const [isUploadJSONError, setIsUploadJSONError] = useState<boolean>(false);
	const [isCreateDashboardError, setIsCreateDashboardError] = useState<boolean>(
		false,
	);
	const [isFeatureAlert, setIsFeatureAlert] = useState<boolean>(false);

	const [dashboardCreating, setDashboardCreating] = useState<boolean>(false);

	const [editorValue, setEditorValue] = useState<string>('');

	const { notifications } = useNotifications();

	const onChangeHandler: UploadProps['onChange'] = (info) => {
		const { fileList } = info;
		const reader = new FileReader();

		const lastFile = fileList[fileList.length - 1];

		if (lastFile.originFileObj) {
			reader.onload = async (event): Promise<void> => {
				if (event.target) {
					const target = event.target.result;
					try {
						if (target) {
							const targetFile = target.toString();
							const parsedValue = JSON.parse(targetFile);
							setJsonData(parsedValue);
							setEditorValue(JSON.stringify(parsedValue, null, 2));
							setIsUploadJSONError(false);
						}
					} catch (error) {
						setIsUploadJSONError(true);
					}
				}
			};
			reader.readAsText(lastFile.originFileObj);
		}
	};

	const onClickLoadJsonHandler = async (): Promise<void> => {
		try {
			setDashboardCreating(true);
			const dashboardData = JSON.parse(editorValue) as DashboardData;

			if (dashboardData?.layout) {
				dashboardData.layout = getUpdatedLayout(dashboardData.layout);
			} else {
				dashboardData.layout = [];
			}

			const response = await createDashboard({
				...dashboardData,
				uploadedGrafana,
			});

			if (response.statusCode === 200) {
				history.push(
					generatePath(ROUTES.DASHBOARD, {
						dashboardId: response.payload.uuid,
					}),
				);
			} else if (response.error === 'feature usage exceeded') {
				setIsFeatureAlert(true);
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			} else {
				setIsCreateDashboardError(true);
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setDashboardCreating(false);
		} catch {
			setDashboardCreating(false);
			setIsFeatureAlert(false);

			setIsCreateDashboardError(true);
		}
	};

	const getErrorNode = (error: string): JSX.Element => (
		<Space>
			<ExclamationCircleTwoTone twoToneColor={[red[7], '#1f1f1f']} />
			<Typography style={{ color: '#D89614' }}>{error}</Typography>
		</Space>
	);

	const onCancelHandler = (): void => {
		setIsUploadJSONError(false);
		setIsCreateDashboardError(false);
		setIsFeatureAlert(false);
		onModalHandler();
	};

	const isDarkMode = useIsDarkMode();

	function setEditorTheme(monaco: Monaco): void {
		monaco.editor.defineTheme('my-theme', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'string.key.json', foreground: Color.BG_VANILLA_400 },
				{ token: 'string.value.json', foreground: Color.BG_ROBIN_400 },
			],
			colors: {
				'editor.background': Color.BG_INK_300,
			},
			fontFamily: 'Space Mono',
			fontSize: 20,
			fontWeight: 'normal',
			lineHeight: 18,
			letterSpacing: -0.06,
		});
	}

	return (
		<Modal
			wrapClassName="import-json-modal"
			open={isImportJSONModalVisible}
			centered
			closable={false}
			destroyOnClose
			width="60vw"
			footer={
				<div className="import-json-modal-footer">
					{isCreateDashboardError && (
						<div className="create-dashboard-json-error">
							{getErrorNode(t('error_loading_json'))}
						</div>
					)}

					{isUploadJSONError && (
						<div className="create-dashboard-json-error">
							{getErrorNode(t('error_upload_json'))}
						</div>
					)}

					<div className="action-btns-container">
						<Upload
							accept=".json"
							showUploadList={false}
							multiple={false}
							onChange={onChangeHandler}
							beforeUpload={(): boolean => false}
							action="none"
							data={jsonData}
						>
							<Button
								type="default"
								className="periscope-btn"
								icon={<MonitorDot size={14} />}
							>
								{' '}
								{t('upload_json_file')}
							</Button>
						</Upload>

						<Button
							// disabled={editorValue.length === 0}
							onClick={onClickLoadJsonHandler}
							loading={dashboardCreating}
							className="periscope-btn primary"
							type="primary"
						>
							{t('load_json')} &nbsp; <MoveRight size={14} />
						</Button>

						{isFeatureAlert && (
							<Typography.Text type="danger">
								{MESSAGE.CREATE_DASHBOARD}
							</Typography.Text>
						)}
					</div>
				</div>
			}
		>
			<div className="import-json-content-container">
				<div className="import-json-content-header">
					<Typography.Text>{t('import_json')}</Typography.Text>

					<X size={14} className="periscope-btn ghost" onClick={onCancelHandler} />
				</div>

				<MEditor
					language="json"
					height="40vh"
					onChange={(newValue): void => setEditorValue(newValue || '')}
					value={editorValue}
					options={{
						scrollbar: {
							alwaysConsumeMouseWheel: false,
						},
						minimap: {
							enabled: false,
						},
						fontSize: 14,
						fontFamily: 'Space Mono',
					}}
					theme={isDarkMode ? 'my-theme' : 'light'}
					// eslint-disable-next-line react/jsx-no-bind
					beforeMount={setEditorTheme}
				/>
			</div>
		</Modal>
	);
}

interface ImportJSONProps {
	isImportJSONModalVisible: boolean;
	onModalHandler: VoidFunction;
	uploadedGrafana: boolean;
}

export default ImportJSON;
