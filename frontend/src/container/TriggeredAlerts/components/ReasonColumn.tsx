import { Info } from 'lucide-react';
import { TooltipSimple } from '@signozhq/ui';

import styles from './ReasonColumn.module.scss';
import TanStackTable from 'components/TanStackTableView';

export interface ReasonColumnProps {
	annotations?: Record<string, string>;
}

function buildTooltipContent(
	description?: string,
	summary?: string,
): JSX.Element {
	return (
		<div className={styles.tooltipContent}>
			{summary && (
				<div className={styles.section}>
					<span className={styles.label}>Summary</span>
					<span className={styles.value}>{summary}</span>
				</div>
			)}
			{description && (
				<div className={styles.section}>
					<span className={styles.label}>Description</span>
					<span className={styles.value}>{description}</span>
				</div>
			)}
		</div>
	);
}

function ReasonColumn({ annotations }: ReasonColumnProps): JSX.Element {
	const description = annotations?.description;
	const summary = annotations?.summary;

	if (!description && !summary) {
		return <TanStackTable.Text className={styles.empty}>-</TanStackTable.Text>;
	}

	const displayText = summary || description || '';
	const truncatedText =
		displayText.length > 60 ? `${displayText.slice(0, 60)}...` : displayText;

	return (
		<TooltipSimple title={buildTooltipContent(description, summary)}>
			<div className={styles.trigger}>
				<TanStackTable.Text className={styles.text}>
					{truncatedText}
				</TanStackTable.Text>
				<Info size={14} className={styles.icon} />
			</div>
		</TooltipSimple>
	);
}

export default ReasonColumn;
