import { Dispatch, SetStateAction, useState } from 'react';
import type { NotificationInstance } from 'antd/es/notification/interface';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { deleteRuleByID } from 'api/generated/services/rules';
import type {
	RenderErrorResponseDTO,
	RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { State } from 'hooks/useFetch';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { PayloadProps as DeleteAlertPayloadProps } from 'types/api/alerts/delete';
import APIError from 'types/api/error';

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

	const { showErrorModal } = useErrorModal();

	const onDeleteHandler = async (id: string): Promise<void> => {
		try {
			await deleteRuleByID({ id });

			setData((state) => state.filter((alert) => alert.id !== id));

			setDeleteAlertState((state) => ({
				...state,
				loading: false,
			}));
			notifications.success({
				message: 'Success',
			});
		} catch (error) {
			setDeleteAlertState((state) => ({
				...state,
				loading: false,
				error: true,
			}));

			showErrorModal(
				convertToApiError(error as AxiosError<RenderErrorResponseDTO>) as APIError,
			);
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
	id: string;
	setData: Dispatch<SetStateAction<RuletypesRuleDTO[]>>;
	notifications: NotificationInstance;
}

export default DeleteAlert;
