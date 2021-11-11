import React, { useState } from 'react';
import { Button } from 'antd';
import { Alerts } from 'types/api/alerts/getAllList';
import { NotificationInstance } from 'antd/lib/notification/index';

import { PayloadProps as DeleteAlertPayloadProps } from 'types/api/alerts/delete';
import deleteAlerts from 'api/alerts/delete';
import { State } from 'hooks/useFetch';

const DeleteAlert = ({ id, setData, notifications }: DeleteAlertProps) => {
	const [deleteAlertState, setDeleteAlertState] = useState<
		State<DeleteAlertPayloadProps>
	>({
		error: false,
		errorMessage: '',
		loading: false,
		success: false,
		payload: undefined,
	});

	const onDeleteHandler = async (id: number) => {
		try {
			setDeleteAlertState((state) => ({
				...state,
				loading: true,
			}));

			const response = await deleteAlerts({
				id,
			});

			if (response.statusCode === 200) {
				setDeleteAlertState((state) => ({
					...state,
					loading: false,
					payload: response.payload,
				}));
				notifications.success({
					message: 'Success',
				});

				setData((state) => state.filter((alert) => alert.id !== id));
			} else {
				setDeleteAlertState((state) => ({
					...state,
					loading: false,
					error: true,
					errorMessage: response.error || 'Something went wrong',
				}));

				notifications.error({
					message: response.error || 'Something went wrong',
				});
			}
		} catch (error) {
			setDeleteAlertState((state) => ({
				...state,
				loading: false,
				error: true,
				errorMessage: 'Something went wrong',
			}));

			notifications.error({
				message: 'Something went wrong',
			});
		}
	};

	return (
		<>
			<Button
				disabled={deleteAlertState.loading || false}
				loading={deleteAlertState.loading || false}
				onClick={() => onDeleteHandler(id)}
				type="link"
			>
				Delete
			</Button>
		</>
	);
};

interface DeleteAlertProps {
	id: Alerts['id'];
	setData: React.Dispatch<React.SetStateAction<Alerts[]>>;
	notifications: NotificationInstance;
}

export default DeleteAlert;
