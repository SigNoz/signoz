import { CopyFilled, DownloadOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import Editor from 'components/Editor';
import { useNotifications } from 'hooks/useNotifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import { DashboardData } from 'types/api/dashboard/getAll';

import { downloadObjectAsJson } from './utils';

function ShareModal({
	isJSONModalVisible,
	onToggleHandler,
	selectedData,
}: ShareModalProps): JSX.Element {
	const getParsedValue = (): string => JSON.stringify(selectedData, null, 2);

	const [jsonValue, setJSONValue] = useState<string>(getParsedValue());
	const { t } = useTranslation(['dashboard', 'common']);
	const [state, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();

	useEffect(() => {
		if (state.error) {
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}

		if (state.value) {
			notifications.success({
				message: t('success', {
					ns: 'common',
				}),
			});
		}
	}, [state.error, state.value, t, notifications]);

	// eslint-disable-next-line arrow-body-style
	const GetFooterComponent = useMemo(() => {
		return (
			<>
				<Button
					style={{
						marginTop: '16px',
					}}
					onClick={(): void => setCopy(jsonValue)}
					type="primary"
					size="small"
				>
					<CopyFilled /> {t('copy_to_clipboard')}
				</Button>

				<Button
					type="primary"
					size="small"
					onClick={(): void => {
						downloadObjectAsJson(selectedData, selectedData.title);
					}}
				>
					<DownloadOutlined /> {t('download_json')}
				</Button>
			</>
		);
	}, [jsonValue, selectedData, setCopy, t]);

	return (
		<Modal
			open={isJSONModalVisible}
			onCancel={(): void => {
				onToggleHandler();
			}}
			width="80vw"
			centered
			title={t('share', {
				ns: 'common',
			})}
			okText={t('download_json')}
			cancelText={t('cancel')}
			destroyOnClose
			footer={GetFooterComponent}
		>
			<Editor
				height="70vh"
				onChange={(value): void => setJSONValue(value)}
				value={jsonValue}
			/>
		</Modal>
	);
}

interface ShareModalProps {
	isJSONModalVisible: boolean;
	onToggleHandler: VoidFunction;
	selectedData: DashboardData;
}

export default ShareModal;
