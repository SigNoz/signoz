import styles from './MappingsColgroup.module.scss';

function MappingsColgroup(): JSX.Element {
	return (
		<colgroup>
			<col className={styles.colTarget} />
			<col />
			<col className={styles.colWritesTo} />
			<col className={styles.colStatus} />
		</colgroup>
	);
}

export default MappingsColgroup;
