import { ExternalLink } from '@signozhq/icons';

import styles from './TooltipContent.module.scss';

// Custom tooltip content component
export default function TooltipContent({
	label,
	description,
	docLink,
}: {
	label: string;
	description?: string;
	docLink?: string;
}): JSX.Element {
	return (
		<div className={styles.content}>
			<strong className={styles.label}>{label}</strong>
			{description && <span className={styles.description}>{description}</span>}
			{docLink && (
				<a
					href={docLink}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e): void => e.stopPropagation()}
					className={styles.docLink}
				>
					Learn more
					<ExternalLink size={12} />
				</a>
			)}
		</div>
	);
}
