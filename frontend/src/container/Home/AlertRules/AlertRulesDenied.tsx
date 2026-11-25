import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import Card from 'periscope/components/Card/Card';

interface AlertRulesDeniedProps {
	deniedPermissions: BrandedPermission[];
}

export default function AlertRulesDenied({
	deniedPermissions,
}: AlertRulesDeniedProps): JSX.Element {
	return (
		<Card className="dashboards-list-card home-data-card">
			<Card.Content>
				<PermissionDeniedCallout deniedPermissions={deniedPermissions} />
			</Card.Content>
		</Card>
	);
}
