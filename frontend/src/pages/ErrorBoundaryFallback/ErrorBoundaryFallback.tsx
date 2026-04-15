import { useCallback } from 'react';
import { Button } from 'antd';
import ROUTES from 'constants/routes';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import { Home, LifeBuoy } from 'lucide-react';
import { handleContactSupport } from 'pages/Integrations/utils';

import cloudUrl from '@/assets/Images/cloud.svg';

import './ErrorBoundaryFallback.styles.scss';

function ErrorBoundaryFallback(): JSX.Element {
	const handleReload = (): void => {
		history.push(ROUTES.HOME);
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
						type="primary"
						onClick={handleReload}
						icon={<Home size={16} />}
						className="periscope-btn primary"
					>
						Go to Home
					</Button>

					<Button
						className="periscope-btn secondary"
						type="default"
						onClick={handleSupport}
						icon={<LifeBuoy size={16} />}
					>
						Contact Support
					</Button>
				</div>
			</div>
		</div>
	);
}

export default ErrorBoundaryFallback;
