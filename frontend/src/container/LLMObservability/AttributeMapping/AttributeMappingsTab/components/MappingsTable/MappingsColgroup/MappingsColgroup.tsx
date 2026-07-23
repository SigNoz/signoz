import styles from './MappingsColgroup.module.scss';

function MappingsColgroup(): JSX.Element {
	return (
		<colgroup>
			<col className={styles.colTarget} />
			<col />
			<col className={styles.colActions} />
		</colgroup>
	);
}

export default MappingsColgroup;
