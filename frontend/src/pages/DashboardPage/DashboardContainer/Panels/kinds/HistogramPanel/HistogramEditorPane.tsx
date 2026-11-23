import { SolidInfoCircle } from '@signozhq/icons';
import { Callout } from '@signozhq/ui/callout';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import type { QueryEditorPaneProps } from '../../types/panelDefinition';
import PanelEditorQueryBuilder from '../../../PanelEditor/PanelEditorQueryBuilder/PanelEditorQueryBuilder';
import { isMetricQuery } from './isMetricQuery';

import styles from './HistogramEditorPane.module.scss';

/**
 * Histogram bins the query's values in the browser, which for a histogram metric
 * means percentiles or rates, not its bucket counts. Distribution reads those, but
 * not logs or traces yet, so the pointer shows for metric queries only.
 */
function HistogramEditorPane({
	panelDefinition,
	isLoadingQueries,
	onStageRunQuery,
	onCancelQuery,
	stickyHeader,
}: QueryEditorPaneProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	return (
		<PanelEditorQueryBuilder
			panelDefinition={panelDefinition}
			isLoadingQueries={isLoadingQueries}
			onStageRunQuery={onStageRunQuery}
			onCancelQuery={onCancelQuery}
			stickyHeader={stickyHeader}
			banner={
				isMetricQuery(currentQuery) && (
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
				)
			}
		/>
	);
}

export default HistogramEditorPane;
