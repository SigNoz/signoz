import styles from './ChangedDot.module.scss';

function ChangedDot({
	title = 'Changed from default',
}: {
	title?: string;
}): JSX.Element {
	return (
		<span
			className={styles.dot}
			title={title}
			aria-label={title}
			data-testid="config-changed-dot"
		/>
	);
}

export default ChangedDot;
