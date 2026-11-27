import { Tooltip } from '@signozhq/ui/tooltip';
import cx from 'classnames';
import TanStackTable from 'components/TanStackTableView';

import styles from './TextCell.module.scss';

interface TextCellProps {
	value: string;
	displayValue?: string;
	monospace?: boolean;
}

export function TextCell({
	value,
	displayValue = value,
	monospace = false,
}: TextCellProps): JSX.Element {
	return (
		<Tooltip title={value}>
			<TanStackTable.Text
				className={cx(styles.textCell, { [styles.monospace]: monospace })}
			>
				{displayValue}
			</TanStackTable.Text>
		</Tooltip>
	);
}
