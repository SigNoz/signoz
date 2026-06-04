import { ChevronDown, ChevronRight } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './SectionHeader.module.scss';

interface Props {
	sectionId: string;
	title: string;
	open: boolean;
	onToggle: () => void;
	repeatVariable?: string;
}

function SectionHeader({
	sectionId,
	title,
	open,
	onToggle,
	repeatVariable,
}: Props): JSX.Element {
	return (
		<div className={cx(styles.header, { [styles.headerOpen]: open })}>
			<button
				type="button"
				className={styles.toggle}
				onClick={onToggle}
				data-testid={`dashboard-section-toggle-${sectionId}`}
			>
				{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
				<Typography.Text className={styles.title}>{title}</Typography.Text>
				{repeatVariable ? (
					<Typography.Text className={styles.repeatBadge}>
						(repeats per ${repeatVariable})
					</Typography.Text>
				) : null}
			</button>
		</div>
	);
}

export default SectionHeader;
