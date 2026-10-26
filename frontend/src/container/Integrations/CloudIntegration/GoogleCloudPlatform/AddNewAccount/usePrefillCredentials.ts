import { useEffect } from 'react';
import { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas';
import { UseFormSetValue } from 'react-hook-form';

import { GcpSetupFormValues } from './types';

// Pre-fill the deployment/ingestion fields with the fetched credentials.
export function usePrefillCredentials(
	connectionParams: CloudintegrationtypesCredentialsDTO | undefined,
	setValue: UseFormSetValue<GcpSetupFormValues>,
): void {
	useEffect(() => {
		if (!connectionParams) {
			return;
		}
		setValue('sigNozApiUrl', connectionParams.sigNozApiUrl);
		setValue('sigNozApiKey', connectionParams.sigNozApiKey);
		setValue('ingestionUrl', connectionParams.ingestionUrl);
		setValue('ingestionKey', connectionParams.ingestionKey);
	}, [connectionParams, setValue]);
}
