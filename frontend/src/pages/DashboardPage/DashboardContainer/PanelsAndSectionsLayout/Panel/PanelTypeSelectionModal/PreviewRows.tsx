import styles from './PanelTypePreview.module.scss';

export interface PreviewCell {
	className: string;
	/** Percent of the row width. */
	width?: number;
}

interface PreviewRowsProps {
	rows: PreviewCell[][];
	rowClassName?: string;
}

function PreviewRows({ rows, rowClassName }: PreviewRowsProps): JSX.Element {
	return (
		<div className={styles.rows}>
			{rows.map((cells, row) => (
				// eslint-disable-next-line react/no-array-index-key
				<div key={row} className={rowClassName}>
					{cells.map(({ className, width }, col) => (
						<span
							// eslint-disable-next-line react/no-array-index-key
							key={col}
							className={className}
							style={width === undefined ? undefined : { width: `${width}%` }}
						/>
					))}
				</div>
			))}
		</div>
	);
}

export default PreviewRows;
