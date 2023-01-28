import { NotificationInstance } from 'antd/es/notification/interface';
import deleteAlerts from 'api/alerts/delete';
import { State } from 'hooks/useFetch';
import React, { useState } from 'react';
import { PayloadProps as DeleteAlertPayloadProps } from 'types/api/alerts/delete';
import { GettableAlert } from 'types/api/alerts/get';

import { ColumnButton } from './styles';

function DeleteAlert({
	id,
	setData,
	notifications,
}: DeleteAlertProps): JSX.Element {
	const [deleteAlertState, setDeleteAlertState] = useState<
		State<DeleteAlertPayloadProps>
	>({
		error: false,
		errorMessage: '',
		loading: false,
		success: false,
		payload: undefined,
	});

	const defaultErrorMessage = 'Something went wrong';

	const onDeleteHandler = async (alertId: number): Promise<void> => {
		try {
			setDeleteAlertState((state) => ({
				...state,
				loading: true,
			}));

			const response = await deleteAlerts({
				id: alertId,
			});

			if (response.statusCode === 200) {
				setData((state) => state.filter((alert) => alert.id !== id));

				setDeleteAlertState((state) => ({
					...state,
					loading: false,
					payload: response.payload,
				}));
				notifications.success({
					message: 'Success',
				});
			} else {
				setDeleteAlertState((state) => ({
					...state,
					loading: false,
					error: true,
					errorMessage: response.error || defaultErrorMessage,
				}));

				notifications.error({
					message: response.error || defaultErrorMessage,
				});
			}
		} catch (error) {
			setDeleteAlertState((state) => ({
				...state,
				loading: false,
				error: true,
				errorMessage: defaultErrorMessage,
			}));

			notifications.error({
				message: defaultErrorMessage,
			});
		}
	};

	return (
		<ColumnButton
			disabled={deleteAlertState.loading || false}
			loading={deleteAlertState.loading || false}
			onClick={(): Promise<void> => onDeleteHandler(id)}
			type="link"
		>
			Delete
		</ColumnButton>
	);
}

interface DeleteAlertProps {
	id: GettableAlert['id'];
	setData: React.Dispatch<React.SetStateAction<GettableAlert[]>>;
	notifications: NotificationInstance;
}

export default DeleteAlert;
