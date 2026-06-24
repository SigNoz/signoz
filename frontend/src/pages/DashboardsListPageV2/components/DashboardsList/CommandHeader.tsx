import { Typography } from '@signozhq/ui/typography';

import NewDashboardButton from './NewDashboardButton';

import styles from './DashboardsList.module.scss';

interface Props {
	label: string;
	count: number;
	canCreate: boolean;
	onCreate: () => void;
}

function CommandHeader({
	label,
	count,
	canCreate,
	onCreate,
}: Props): JSX.Element {
	return (
		<div className={styles.commandHeader}>
			<div className={styles.headingBlock}>
				<Typography.Title className={styles.title}>{label}</Typography.Title>
				<span className={styles.countPill}>{count}</span>
			</div>
			<div className={styles.grow} />
			{canCreate && <NewDashboardButton onClick={onCreate} />}
		</div>
	);
}

export default CommandHeader;
