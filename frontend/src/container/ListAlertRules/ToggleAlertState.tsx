import { Dispatch, SetStateAction, useState } from 'react';
import { patchRulePartial } from 'api/alerts/patchRulePartial';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type {
	RenderErrorResponseDTO,
	RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { State } from 'hooks/useFetch';
import { useNotifications } from 'hooks/useNotifications';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { ColumnButton } from './styles';

function ToggleAlertState({
	id,
	disabled,
	setData,
}: ToggleAlertStateProps): JSX.Element {
	const [apiStatus, setAPIStatus] = useState<State<RuletypesRuleDTO>>({
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

			const response = await patchRulePartial(id, { disabled });
			const { data: updatedRule } = response;

			setData((state) =>
				state.map((alert) => {
					if (alert.id === id) {
						return {
							...alert,
							disabled: updatedRule.disabled,
							state: updatedRule.state,
						};
					}
					return alert;
				}),
			);

			setAPIStatus((state) => ({
				...state,
				loading: false,
				payload: updatedRule,
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
	id: string;
	disabled: boolean;
	setData: Dispatch<SetStateAction<RuletypesRuleDTO[]>>;
}

export default ToggleAlertState;
