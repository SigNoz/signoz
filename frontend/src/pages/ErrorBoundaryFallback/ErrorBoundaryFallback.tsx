import { useCallback } from 'react';
import ROUTES from 'constants/routes';
import { handleContactSupport } from 'container/Integrations/utils';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { Home, LifeBuoy } from '@signozhq/icons';
import { withBasePath } from 'utils/basePath';

import cloudUrl from '@/assets/Images/cloud.svg';

import './ErrorBoundaryFallback.styles.scss';
import { Button } from '@signozhq/ui/button';

function ErrorBoundaryFallback(): JSX.Element {
	const handleReload = (): void => {
		// Hard reload resets Sentry.ErrorBoundary state; withBasePath preserves any /signoz/ prefix.
		window.location.href = withBasePath(ROUTES.HOME);
	};

	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const handleSupport = useCallback(() => {
		handleContactSupport(isCloudUserVal);
	}, [isCloudUserVal]);

	return (
		<div className="error-boundary-fallback-container">
			<div className="error-boundary-fallback-content">
				<div className="error-icon">
					<img src={cloudUrl} alt="error-cloud-icon" />
				</div>
				<div className="title">Something went wrong :/</div>

				<div className="description">
					Our team is getting on top to resolve this. Please reach out to support if
					the issue persists.
				</div>

				<div className="actions">
					<Button
						onClick={handleReload}
						prefix={<Home size={16} />}
						variant="solid"
						color="primary"
					>
						Go to Home
					</Button>

					<Button
						onClick={handleSupport}
						variant="outlined"
						color="secondary"
						prefix={<LifeBuoy size={16} />}
					>
						Contact Support
					</Button>
				</div>
			</div>
		</div>
	);
}

export default ErrorBoundaryFallback;
