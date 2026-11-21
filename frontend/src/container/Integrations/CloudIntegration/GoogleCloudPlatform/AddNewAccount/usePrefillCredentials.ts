import { useEffect } from 'react';
import type { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas';
import type { UseFormSetValue } from 'react-hook-form';

import type { GcpSetupFormValues } from './types';

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
