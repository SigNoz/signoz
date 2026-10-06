import { ReactNode } from 'react';

import styles from './TraceTooltip.module.scss';

interface TooltipSectionProps {
	children: ReactNode;
}

function TooltipSection({ children }: TooltipSectionProps): JSX.Element {
	return <div className={styles.section}>{children}</div>;
}

export default TooltipSection;
