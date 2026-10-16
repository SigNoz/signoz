import styles from './PanelTypePreview.module.scss';

interface PreviewBarsProps {
	heights: number[];
	/** Fade each successive bar (ranked bars) instead of a uniform opacity. */
	fade: boolean;
	className: string;
}

function PreviewBars({
	heights,
	fade,
	className,
}: PreviewBarsProps): JSX.Element {
	return (
		<div className={className}>
			{heights.map((height, i) => (
				<div
					// eslint-disable-next-line react/no-array-index-key
					key={i}
					className={styles.bar}
					style={{ height: `${height}%`, opacity: fade ? 1 - i * 0.15 : 0.75 }}
				/>
			))}
		</div>
	);
}

export default PreviewBars;
