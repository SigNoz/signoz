import { Info } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './DimensionsSection.module.scss';

interface LabelWithInfoProps {
	label: string;
	info: string;
	testId: string;
}

function LabelWithInfo({
	label,
	info,
	testId,
}: LabelWithInfoProps): JSX.Element {
	return (
		<span className={styles.labelWithInfo}>
			{label}
			<TooltipSimple
				title={info}
				tooltipContentProps={{ className: styles.infoTooltip }}
			>
				<span className={styles.info} data-testid={testId}>
					<Info size={12} />
				</span>
			</TooltipSimple>
		</span>
	);
}

export default LabelWithInfo;
