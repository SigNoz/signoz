import { NotificationInstance } from 'antd/es/notification/interface';
import deleteAlerts from 'api/alerts/delete';
import { State } from 'hooks/useFetch';
import { Dispatch, SetStateAction, useState } from 'react';
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

	const onDeleteHandler = async (id: number): Promise<void> => {
		try {
			const response = await deleteAlerts({
				id,
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

	const onClickHandler = (): void => {
		setDeleteAlertState((state) => ({
			...state,
			loading: true,
		}));
		onDeleteHandler(id);
	};

	return (
		<ColumnButton
			disabled={deleteAlertState.loading || false}
			loading={deleteAlertState.loading || false}
			onClick={onClickHandler}
			type="link"
		>
			Delete
		</ColumnButton>
	);
}

interface DeleteAlertProps {
	id: GettableAlert['id'];
	setData: Dispatch<SetStateAction<GettableAlert[]>>;
	notifications: NotificationInstance;
}

export default DeleteAlert;
