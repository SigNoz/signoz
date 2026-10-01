import { Info } from '@signozhq/icons';
import { Tooltip } from '@signozhq/ui/tooltip';

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
			<Tooltip title={info}>
				<span className={styles.info} data-testid={testId}>
					<Info size={12} />
				</span>
			</Tooltip>
		</span>
	);
}

export default LabelWithInfo;
