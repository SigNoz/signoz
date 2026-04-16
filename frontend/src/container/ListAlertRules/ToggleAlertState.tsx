import { Dispatch, SetStateAction, useState } from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { patchRuleByID } from 'api/generated/services/rules';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { State } from 'hooks/useFetch';
import { useNotifications } from 'hooks/useNotifications';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { GettableAlert } from 'types/api/alerts/get';
import { PayloadProps as PatchPayloadProps } from 'types/api/alerts/patch';
import APIError from 'types/api/error';

import { ColumnButton } from './styles';

function ToggleAlertState({
	id,
	disabled,
	setData,
}: ToggleAlertStateProps): JSX.Element {
	const [apiStatus, setAPIStatus] = useState<State<PatchPayloadProps>>({
		error: false,
		errorMessage: '',
		loading: false,
		success: false,
		payload: undefined,
	});

	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();

	const onToggleHandler = async (
		id: string,
		disabled: boolean,
	): Promise<void> => {
		try {
			setAPIStatus((state) => ({
				...state,
				loading: true,
			}));

			const response = await patchRuleByID({ id }, { disabled } as any);
			const payload = response.data as any;

			setData((state) =>
				state.map((alert) => {
					if (alert.id === id) {
						return {
							...alert,
							disabled: payload.disabled,
							state: payload.state,
						};
					}
					return alert;
				}),
			);

			setAPIStatus((state) => ({
				...state,
				loading: false,
				payload,
			}));
			notifications.success({
				message: 'Success',
			});
		} catch (error) {
			setAPIStatus((state) => ({
				...state,
				loading: false,
				error: true,
			}));

			showErrorModal(
				convertToApiError(error as AxiosError<RenderErrorResponseDTO>) as APIError,
			);
		}
	};

	return (
		<ColumnButton
			disabled={apiStatus.loading || false}
			loading={apiStatus.loading || false}
			onClick={(): Promise<void> => onToggleHandler(id, !disabled)}
			type="link"
		>
			{disabled ? 'Enable' : 'Disable'}
		</ColumnButton>
	);
}

interface ToggleAlertStateProps {
	id: GettableAlert['id'];
	disabled: boolean;
	setData: Dispatch<SetStateAction<GettableAlert[]>>;
}

export default ToggleAlertState;
