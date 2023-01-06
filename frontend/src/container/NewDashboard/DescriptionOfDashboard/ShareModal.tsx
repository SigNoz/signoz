import { Button, Modal, notification, Typography } from 'antd';
import Editor from 'components/Editor';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import { DashboardData } from 'types/api/dashboard/getAll';

import { downloadObjectAsJson } from './util';

function ShareModal({
	isJSONModalVisible,
	onToggleHandler,
	selectedData,
}: ShareModalProps): JSX.Element {
	const getParsedValue = (): string => {
		const updatedData: DashboardData = {
			...selectedData,
			widgets: selectedData.widgets?.map((widget) => ({
				...widget,
				queryData: {
					...widget.queryData,
					loading: false,
					error: false,
					errorMessage: '',
				},
			})),
		};
		return JSON.stringify(updatedData, null, 2);
	};

	const [jsonValue, setJSONValue] = useState<string>(getParsedValue());
	const [isViewJSON, setIsViewJSON] = useState<boolean>(false);
	const { t } = useTranslation(['dashboard', 'common']);
	const [state, setCopy] = useCopyToClipboard();

	useEffect(() => {
		if (state.error) {
			notification.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}

		if (state.value) {
			notification.success({
				message: t('success', {
					ns: 'common',
				}),
			});
		}
	}, [state.error, state.value, t]);

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
			<Button onClick={(): void => setCopy(jsonValue)} type="primary">
				{t('copy_to_clipboard')}
			</Button>
		);
	}, [isViewJSON, jsonValue, selectedData, setCopy, t]);

	return (
		<Modal
			visible={isJSONModalVisible}
			onCancel={(): void => {
				onToggleHandler();
				setIsViewJSON(false);
			}}
			width="70vw"
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
				<Editor onChange={(value): void => setJSONValue(value)} value={jsonValue} />
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
