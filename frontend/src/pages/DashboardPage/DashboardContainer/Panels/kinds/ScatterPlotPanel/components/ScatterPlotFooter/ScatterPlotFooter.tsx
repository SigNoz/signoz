import styles from './ScatterPlotFooter.module.scss';

interface ScatterPlotFooterProps {
	text: string;
}

function ScatterPlotFooter({ text }: ScatterPlotFooterProps): JSX.Element {
	return (
		<div className={styles.footer} title={text} data-testid="scatter-plot-footer">
			{text}
		</div>
	);
}

export default ScatterPlotFooter;
