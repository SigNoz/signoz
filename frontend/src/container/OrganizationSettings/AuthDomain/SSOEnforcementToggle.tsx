import { useEffect, useState } from 'react';
import { Switch } from '@signozhq/ui/switch';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { useUpdateAuthDomain } from 'api/generated/services/authdomains';
import {
	AuthtypesGettableAuthDomainDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

interface SSOEnforcementToggleProps {
	isDefaultChecked: boolean;
	record: AuthtypesGettableAuthDomainDTO;
}

function SSOEnforcementToggle({
	isDefaultChecked,
	record,
}: SSOEnforcementToggleProps): JSX.Element {
	const [isChecked, setIsChecked] = useState<boolean>(isDefaultChecked);
	const { showErrorModal } = useErrorModal();

	useEffect(() => {
		setIsChecked(isDefaultChecked);
	}, [isDefaultChecked]);

	const { mutate: updateAuthDomain, isLoading } =
		useUpdateAuthDomain<AxiosError<RenderErrorResponseDTO>>();

	const onChangeHandler = (checked: boolean): void => {
		if (!record.id) {
			return;
		}

		setIsChecked(checked);

		updateAuthDomain(
			{
				pathParams: { id: record.id },
				data: {
					config: {
						ssoEnabled: checked,
						ssoType: record.config?.ssoType,
						googleAuthConfig: record.config?.googleAuthConfig,
						oidcConfig: record.config?.oidcConfig,
						samlConfig: record.config?.samlConfig,
						roleMapping: record.config?.roleMapping,
					},
				},
			},
			{
				onError: (error) => {
					setIsChecked(!checked);
					try {
						ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
					} catch (apiError) {
						showErrorModal(apiError as APIError);
					}
				},
			},
		);
	};

	return (
		<Switch disabled={isLoading} value={isChecked} onChange={onChangeHandler} />
	);
}

export default SSOEnforcementToggle;
