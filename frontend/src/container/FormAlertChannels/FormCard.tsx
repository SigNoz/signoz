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
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					{title}
				</Typography>
				{!!description && (
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						{description}
					</Typography>
				)}
			</header>
			<div className={styles.body}>{children}</div>
		</section>
	);
}

FormCard.defaultProps = { description: undefined };

export default FormCard;
