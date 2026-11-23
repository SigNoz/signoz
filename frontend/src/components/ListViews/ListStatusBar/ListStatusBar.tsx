import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { PanelLeftClose, PanelLeftOpen } from '@signozhq/icons';

import styles from './ListStatusBar.module.scss';

interface Props {
	collapsed: boolean;
	onToggleCollapse: () => void;
	count: number;
	total: number;
	/** Plural noun for the counted items, e.g. "dashboards". */
	noun: string;
	testId: string;
}

function ListStatusBar({
	collapsed,
	onToggleCollapse,
	count,
	total,
	noun,
	testId,
}: Props): JSX.Element {
	return (
		<div className={styles.statusBar}>
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				prefix={
					collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />
				}
				onClick={onToggleCollapse}
				testId={testId}
			>
				{collapsed ? 'Expand' : 'Collapse'}
			</Button>
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="tertiary"
				as="span"
				textOverflow="wrap"
			>
				{count} of {total} {noun}
			</Typography>
		</div>
	);
}

export default ListStatusBar;
