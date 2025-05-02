import './importJSON.styles.scss';

import { red } from '@ant-design/colors';
import { ExclamationCircleTwoTone } from '@ant-design/icons';
import MEditor, { Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Flex,
	Modal,
	Space,
	Typography,
	Upload,
	UploadProps,
} from 'antd';
import logEvent from 'api/common/logEvent';
import createDashboard from 'api/dashboard/create';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { getUpdatedLayout } from 'lib/dashboard/getUpdatedLayout';
import { ExternalLink, Github, MonitorDot, MoveRight, X } from 'lucide-react';
// #TODO: Lucide will be removing brand icons like GitHub in the future. In that case, we can use Simple Icons. https://simpleicons.org/
// See more: https://github.com/lucide-icons/lucide/issues/94
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath } from 'react-router-dom';
import { DashboardData } from 'types/api/dashboard/getAll';

function ImportJSON({
	isImportJSONModalVisible,
	uploadedGrafana,
	onModalHandler,
}: ImportJSONProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const [jsonData, setJsonData] = useState<Record<string, unknown>>();
	const { t } = useTranslation(['dashboard', 'common']);
	const [isUploadJSONError, setIsUploadJSONError] = useState<boolean>(false);
	const [isCreateDashboardError, setIsCreateDashboardError] = useState<boolean>(
		false,
	);

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
			logEvent('Dashboard List: Import and next clicked', {});

			const dashboardData = JSON.parse(editorValue) as DashboardData;

			// Remove uuid from the dashboard data, in all cases - empty, duplicate or any valid not duplicate uuid
			if (dashboardData.uuid !== undefined) {
				delete dashboardData.uuid;
			}

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
				safeNavigate(
					generatePath(ROUTES.DASHBOARD, {
						dashboardId: response.payload.uuid,
					}),
				);
				logEvent('Dashboard List: New dashboard imported successfully', {
					dashboardId: response.payload?.uuid,
					dashboardName: response.payload?.data?.title,
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
		} catch (error) {
			setDashboardCreating(false);
			setIsCreateDashboardError(true);
			notifications.error({
				message: error instanceof Error ? error.message : t('error_loading_json'),
			});
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
						<Flex gap="small">
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
									onClick={(): void => {
										logEvent('Dashboard List: Upload JSON file clicked', {});
									}}
								>
									{' '}
									{t('upload_json_file')}
								</Button>
							</Upload>
							<a
								href="https://github.com/SigNoz/dashboards"
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
							// disabled={editorValue.length === 0}
							onClick={onClickLoadJsonHandler}
							loading={dashboardCreating}
							className="periscope-btn primary"
							type="primary"
						>
							{t('import_and_next')} &nbsp; <MoveRight size={14} />
						</Button>
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
					onMount={(_, monaco): void => {
						document.fonts.ready.then(() => {
							monaco.editor.remeasureFonts();
						});
					}}
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
