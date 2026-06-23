import { Typography } from '@signozhq/ui/typography';

import styles from './NoData.module.scss';

interface NoDataProps {
	/** Message to display. Defaults to "No data". */
	label?: string;
	'data-testid'?: string;
}

/**
 * Shared empty-state for panel renderers, shown when a query resolves but
 * returns nothing to plot. Centred in the panel body so every panel kind
 * surfaces the same "No data" affordance instead of each renderer (or its
 * underlying chart) inventing its own copy and casing.
 */
function NoData({
	label = 'No data',
	'data-testid': testId = 'panel-no-data',
}: NoDataProps): JSX.Element {
	return (
		<div className={styles.noData} data-testid={testId}>
			<Typography.Text className={styles.noDataText}>{label}</Typography.Text>
		</div>
	);
}

export default NoData;
