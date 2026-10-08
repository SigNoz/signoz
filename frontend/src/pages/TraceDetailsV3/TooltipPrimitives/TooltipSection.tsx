import { ReactNode } from 'react';

import styles from './TooltipPrimitives.module.scss';

interface TooltipSectionProps {
	children: ReactNode;
}

function TooltipSection({ children }: TooltipSectionProps): JSX.Element {
	return <div className={styles.section}>{children}</div>;
}

export default TooltipSection;
