import { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';

import styles from './FormCard.module.scss';

interface FormCardProps {
	title: string;
	/** One line on what the group is for, where the title alone is not enough. */
	description?: string;
	children: ReactNode;
}

function FormCard({
	title,
	description,
	children,
}: FormCardProps): JSX.Element {
	return (
		<section className={styles.card}>
			<header className={styles.head}>
				<Typography.Text className={styles.title}>{title}</Typography.Text>
				{!!description && (
					<Typography.Text size="sm" color="muted">
						{description}
					</Typography.Text>
				)}
			</header>
			<div className={styles.body}>{children}</div>
		</section>
	);
}

FormCard.defaultProps = { description: undefined };

export default FormCard;
