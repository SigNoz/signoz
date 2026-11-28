import { Badge } from '@signozhq/ui/badge';
import { Tooltip } from '@signozhq/ui/tooltip';
import TanStackTable from 'components/TanStackTableView';

import styles from './EmailCell.module.scss';

interface EmailCellProps {
	email: string;
	isBot: boolean;
}

export function EmailCell({ email, isBot }: EmailCellProps): JSX.Element {
	return (
		<div className={styles.emailCell}>
			<Tooltip title={email}>
				<TanStackTable.Text className={styles.email}>{email}</TanStackTable.Text>
			</Tooltip>
			{isBot && (
				<span className={styles.badge}>
					<Badge variant="outlined" color="info" textTransform="none">
						BOT
					</Badge>
				</span>
			)}
		</div>
	);
}
