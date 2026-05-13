import { useCallback } from 'react';
import { LifeBuoy, RefreshCw, TriangleAlert } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { handleContactSupport } from 'container/Integrations/utils';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';

import styles from './ErrorEmptyState.module.scss';

interface ErrorEmptyStateProps {
	title?: string;
	subtitle?: string;
	onRefresh?: () => void;
}

function ErrorEmptyState({
	title = 'Something went wrong',
	subtitle = 'Our team is getting on top to resolve this. Please reach out to support if the issue persists.',
	onRefresh,
}: ErrorEmptyStateProps): JSX.Element {
	const { isCloudUser } = useGetTenantLicense();

	const onContactSupport = useCallback((): void => {
		handleContactSupport(isCloudUser);
	}, [isCloudUser]);

	return (
		<div className={styles.emptyState} data-testid="error-empty-state">
			<TriangleAlert className={styles.icon} size={32} />
			<div className={styles.title} data-testid="error-title">
				{title}
			</div>
			<div className={styles.subtitle} data-testid="error-subtitle">
				{subtitle}
			</div>
			<div className={styles.actions}>
				<Button
					variant="solid"
					color="secondary"
					prefix={<LifeBuoy size={14} />}
					onClick={onContactSupport}
					data-testid="error-contact-support-button"
				>
					Contact Support
				</Button>
				{onRefresh && (
					<Button
						variant="outlined"
						color="secondary"
						prefix={<RefreshCw size={14} />}
						onClick={onRefresh}
						data-testid="error-refresh-button"
					>
						Refresh
					</Button>
				)}
			</div>
		</div>
	);
}

export default ErrorEmptyState;
