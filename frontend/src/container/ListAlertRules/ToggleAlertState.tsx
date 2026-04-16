import { Dispatch, SetStateAction, useState } from 'react';
import { patchRuleByID } from 'api/generated/services/rules';
import { State } from 'hooks/useFetch';
import { useNotifications } from 'hooks/useNotifications';
import { GettableAlert } from 'types/api/alerts/get';
import { PayloadProps as PatchPayloadProps } from 'types/api/alerts/patch';

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

	const defaultErrorMessage = 'Something went wrong';

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
				errorMessage: defaultErrorMessage,
			}));

			notifications.error({
				message: defaultErrorMessage,
			});
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
