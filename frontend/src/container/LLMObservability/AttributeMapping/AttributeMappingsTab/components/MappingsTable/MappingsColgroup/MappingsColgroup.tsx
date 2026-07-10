import styles from './MappingsColgroup.module.scss';

// Shared <colgroup> for every table in the listing: the standalone column
// header and each group panel's mappers table. All of them are width-100% +
// table-layout: fixed, so identical col widths keep their columns aligned
// even though antd Collapse splits them into separate <table> elements.
function MappingsColgroup(): JSX.Element {
	return (
		<colgroup>
			<col className={styles.colTarget} />
			<col />
			<col className={styles.colWritesTo} />
			<col className={styles.colActions} />
		</colgroup>
	);
}

export default MappingsColgroup;
