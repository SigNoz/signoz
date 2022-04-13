import { Button, Modal, notification, Typography } from 'antd';
import Editor from 'components/Editor';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardData } from 'types/api/dashboard/getAll';

import { downloadObjectAsJson } from './util';

function ShareModal({
	isJSONModalVisible,
	onToggleHandler,
	selectedData,
}: ShareModalProps): JSX.Element {
	const jsonValue = useRef<string>(JSON.stringify(selectedData, null, 2));
	const [isViewJSON, setIsViewJSON] = useState<boolean>(false);
	const { t } = useTranslation(['dashboard', 'common']);

	const onClickCopyClipBoardHandler = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(jsonValue.current);
			notification.success({
				message: t('success', {
					ns: 'common',
				}),
			});
		} catch (error) {
			notification.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	}, [t]);

	const GetFooterComponent = useMemo(() => {
		if (!isViewJSON) {
			return (
				<>
					<Button
						onClick={(): void => {
							setIsViewJSON(true);
						}}
					>
						{t('view_json')}
					</Button>

					<Button
						type="primary"
						onClick={(): void => {
							downloadObjectAsJson(selectedData, selectedData.title);
						}}
					>
						{t('download_json')}
					</Button>
				</>
			);
		}
		return (
			<Button onClick={onClickCopyClipBoardHandler} type="primary">
				{t('copy_to_clipboard')}
			</Button>
		);
	}, [isViewJSON, onClickCopyClipBoardHandler, selectedData, t]);

	return (
		<Modal
			visible={isJSONModalVisible}
			onCancel={(): void => {
				onToggleHandler();
				setIsViewJSON(false);
			}}
			centered
			title={t('share', {
				ns: 'common',
			})}
			okText={t('download_json')}
			cancelText={t('cancel')}
			destroyOnClose
			footer={GetFooterComponent}
		>
			{!isViewJSON ? (
				<Typography>{t('export_dashboard')}</Typography>
			) : (
				<Editor value={jsonValue} />
			)}
		</Modal>
	);
}

interface ShareModalProps {
	isJSONModalVisible: boolean;
	onToggleHandler: VoidFunction;
	selectedData: DashboardData;
}

export default ShareModal;
