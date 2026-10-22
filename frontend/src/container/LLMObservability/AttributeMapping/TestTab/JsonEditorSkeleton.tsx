import styles from './JsonEditorSkeleton.module.scss';

interface SkeletonLine {
	indent: number;
	barWidths: number[];
}

const SKELETON_LINES: SkeletonLine[] = [
	{ indent: 0, barWidths: [10] },
	{ indent: 1, barWidths: [90, 10] },
	{ indent: 2, barWidths: [155, 190] },
	{ indent: 2, barWidths: [135, 190] },
	{ indent: 2, barWidths: [150, 50] },
	{ indent: 2, barWidths: [180, 35] },
	{ indent: 2, barWidths: [185, 200] },
	{ indent: 1, barWidths: [14] },
	{ indent: 1, barWidths: [75, 10] },
	{ indent: 2, barWidths: [95, 90] },
	{ indent: 2, barWidths: [170, 85] },
	{ indent: 1, barWidths: [10] },
	{ indent: 0, barWidths: [10] },
];

const INDENT_WIDTH_PX = 14;

function JsonEditorSkeleton(): JSX.Element {
	return (
		<div
			className={styles.skeleton}
			data-testid="json-editor-skeleton"
			aria-hidden="true"
		>
			{SKELETON_LINES.map((line, lineIndex) => (
				// eslint-disable-next-line react/no-array-index-key
				<div key={lineIndex} className={styles.line}>
					<span className={styles.lineNumber}>{lineIndex + 1}</span>
					<span
						className={styles.lineContent}
						style={{ paddingLeft: line.indent * INDENT_WIDTH_PX }}
					>
						{line.barWidths.map((width, barIndex) => (
							<span
								// eslint-disable-next-line react/no-array-index-key
								key={barIndex}
								className={styles.bar}
								style={{ width }}
							/>
						))}
					</span>
				</div>
			))}
		</div>
	);
}

export default JsonEditorSkeleton;
