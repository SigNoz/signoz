import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Info } from '@signozhq/icons';

import styles from './SectionDivider.module.scss';

interface SectionDividerProps {
	label: string;
	tooltip?: string;
}

export function SectionDivider({
	label,
	tooltip,
}: SectionDividerProps): JSX.Element {
	const testId = label.toLowerCase().replace(/\s+/g, '-');
	return (
		<div className={styles.divider} data-testid={`section-divider-${testId}`}>
			<div className={styles.line} />
			<Typography
				variant="uppercase"
				size="small"
				weight="bold"
				color="tertiary"
				as="span"
				textOverflow="visible"
			>
				{label}
			</Typography>
			{tooltip && (
				<Tooltip title={tooltip}>
					<Info
						size={12}
						className={styles.infoIcon}
						data-testid="section-divider-info"
					/>
				</Tooltip>
			)}
			<div className={styles.line} />
		</div>
	);
}
