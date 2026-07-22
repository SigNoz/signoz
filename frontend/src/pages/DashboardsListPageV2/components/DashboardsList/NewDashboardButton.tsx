import { Button } from '@signozhq/ui/button';
import { Plus } from '@signozhq/icons';

interface Props {
	onClick: () => void;
}

function NewDashboardButton({ onClick }: Props): JSX.Element {
	return (
		<Button
			variant="solid"
			color="primary"
			prefix={<Plus size={14} />}
			onClick={onClick}
			testId="new-dashboard-cta"
		>
			New dashboard
		</Button>
	);
}

export default NewDashboardButton;
