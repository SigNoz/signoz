import { Tooltip } from '@signozhq/ui/tooltip';
import TanStackTable from 'components/TanStackTableView';

import styles from './MonospaceCell.module.scss';

interface MonospaceCellProps {
	value: string;
}

export function MonospaceCell({ value }: MonospaceCellProps): JSX.Element {
	return (
		<Tooltip title={value}>
			<TanStackTable.Text className={styles.monospaceCell}>
				{value}
			</TanStackTable.Text>
		</Tooltip>
	);
}
