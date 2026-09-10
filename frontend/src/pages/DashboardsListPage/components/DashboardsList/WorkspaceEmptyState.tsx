import EmptyState from '../states/EmptyState/EmptyState';
import NewDashboardButton from './NewDashboardButton';

import styles from './DashboardsList.module.scss';

interface Props {
	canCreate: boolean;
	onCreate: () => void;
}

function WorkspaceEmptyState({ canCreate, onCreate }: Props): JSX.Element {
	return (
		<div className={styles.emptyWrap}>
			<EmptyState
				createDropdown={
					canCreate ? <NewDashboardButton onClick={onCreate} /> : null
				}
			/>
		</div>
	);
}

export default WorkspaceEmptyState;
