import { Plus } from '@signozhq/icons';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { DashboardCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

const CHECKS = [DashboardCreatePermission];

interface Props {
	onClick: () => void;
}

function NewDashboardButton({ onClick }: Props): JSX.Element {
	return (
		<AuthZButton
			checks={CHECKS}
			variant="solid"
			color="primary"
			prefix={<Plus size={14} />}
			onClick={onClick}
			testId="new-dashboard-cta"
		>
			New dashboard
		</AuthZButton>
	);
}

export default NewDashboardButton;
