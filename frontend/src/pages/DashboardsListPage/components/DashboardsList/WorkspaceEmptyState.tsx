import EmptyState from '../states/EmptyState/EmptyState';
import NewDashboardButton from './NewDashboardButton';

import styles from './DashboardsList.module.scss';

interface Props {
	onCreate: () => void;
}

function WorkspaceEmptyState({ onCreate }: Props): JSX.Element {
	return (
		<div className={styles.emptyWrap}>
			<EmptyState createDropdown={<NewDashboardButton onClick={onCreate} />} />
		</div>
	);
}

export default WorkspaceEmptyState;
