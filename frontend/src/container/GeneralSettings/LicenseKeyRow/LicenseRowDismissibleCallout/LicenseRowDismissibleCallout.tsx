import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Callout } from '@signozhq/callout';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

import './LicenseRowDismissible.styles.scss';

const CALLOUT_DISMISSED_KEY = 'license_key_callout_dismissed';

function LicenseRowDismissibleCallout(): JSX.Element | null {
	const [isCalloutDismissed, setIsCalloutDismissed] = useState<boolean>(
		() => localStorage.getItem(CALLOUT_DISMISSED_KEY) === 'true',
	);

	const { user, featureFlags } = useAppContext();
	const { isCloudUser } = useGetTenantLicense();

	const isAdmin = user.role === USER_ROLES.ADMIN;
	const isEditor = user.role === USER_ROLES.EDITOR;

	const isGatewayEnabled =
		featureFlags?.find((feature) => feature.name === FeatureKeys.GATEWAY)
			?.active || false;

	// Service accounts are only accessible to admins
	const hasServiceAccountsAccess = isAdmin;

	// Ingestion settings are accessible to:
	// - Cloud users when gateway is not enabled
	// - Admin/Editor when gateway is enabled
	const hasIngestionAccess =
		(isCloudUser && !isGatewayEnabled) ||
		(isGatewayEnabled && (isAdmin || isEditor));

	const handleDismissCallout = (): void => {
		localStorage.setItem(CALLOUT_DISMISSED_KEY, 'true');
		setIsCalloutDismissed(true);
	};

	return !isCalloutDismissed ? (
		<Callout
			type="info"
			size="small"
			showIcon
			dismissable
			onClose={handleDismissCallout}
			className="license-key-callout"
			description={
				<div className="license-key-callout__description">
					This is <strong>NOT</strong> your ingestion or Service account key.
					{(hasServiceAccountsAccess || hasIngestionAccess) && (
						<>
							{' '}
							Find your{' '}
							{hasServiceAccountsAccess && (
								<Link
									to={ROUTES.SERVICE_ACCOUNTS_SETTINGS}
									className="license-key-callout__link"
								>
									Service account here
								</Link>
							)}
							{hasServiceAccountsAccess && hasIngestionAccess && ' and '}
							{hasIngestionAccess && (
								<Link
									to={ROUTES.INGESTION_SETTINGS}
									className="license-key-callout__link"
								>
									Ingestion key here
								</Link>
							)}
							.
						</>
					)}
				</div>
			}
		/>
	) : null;
}

export default LicenseRowDismissibleCallout;
