import { ReactNode } from 'react';

import styles from './TraceTooltip.module.scss';

interface TraceTooltipSectionProps {
	children: ReactNode;
}

function TraceTooltipSection({
	children,
}: TraceTooltipSectionProps): JSX.Element {
	return <div className={styles.section}>{children}</div>;
}

export default TraceTooltipSection;
