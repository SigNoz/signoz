import { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';

import styles from './DetailsField.module.scss';

interface DetailsFieldProps {
	label: string;
	children: ReactNode;
}

export function DetailsField({
	label,
	children,
}: DetailsFieldProps): JSX.Element {
	return (
		<div className={styles.field}>
			<Typography
				variant="uppercase"
				size="small"
				weight="bold"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				{label}
			</Typography>
			<div className={styles.value}>{children}</div>
		</div>
	);
}
