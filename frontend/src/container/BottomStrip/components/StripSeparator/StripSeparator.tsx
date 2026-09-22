import styles from './StripSeparator.module.scss';

function StripSeparator(): JSX.Element {
	return <span className={styles.separator} aria-hidden />;
}

export default StripSeparator;
