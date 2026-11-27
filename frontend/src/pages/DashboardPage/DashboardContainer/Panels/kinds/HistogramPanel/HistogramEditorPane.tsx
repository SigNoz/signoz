import { SolidInfoCircle } from '@signozhq/icons';
import { Callout } from '@signozhq/ui/callout';

import type { QueryEditorPaneProps } from '../../types/panelDefinition';
import PanelEditorQueryBuilder from '../../../PanelEditor/PanelEditorQueryBuilder/PanelEditorQueryBuilder';

import styles from './HistogramEditorPane.module.scss';

/**
 * Histogram bins the query's values in the browser: percentiles or rates of a
 * histogram metric, or per-interval aggregates of logs and traces, not the bucket
 * counts Distribution reads.
 */
function HistogramEditorPane({
	panelDefinition,
	isLoadingQueries,
	onStageRunQuery,
	onCancelQuery,
	stickyHeader,
}: QueryEditorPaneProps): JSX.Element {
	return (
		<PanelEditorQueryBuilder
			panelDefinition={panelDefinition}
			isLoadingQueries={isLoadingQueries}
			onStageRunQuery={onStageRunQuery}
			onCancelQuery={onCancelQuery}
			stickyHeader={stickyHeader}
			banner={
				<div className={styles.banner}>
					<Callout
						color="primary"
						size="sm"
						icon={<SolidInfoCircle />}
						testId="histogram-distribution-banner"
					>
						For bucket counts over the time range, use the Distribution panel.
					</Callout>
				</div>
			}
		/>
	);
}

export default HistogramEditorPane;
