import { Info } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './ReasonColumn.module.scss';
import TanStackTable from 'components/TanStackTableView';
import { ReasonColumnTooltipContent } from './ReasonColumnTooltipContent';

export interface ReasonColumnProps {
	annotations?: Record<string, string>;
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
		<TooltipSimple
			title={
				<ReasonColumnTooltipContent summary={summary} description={description} />
			}
		>
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
