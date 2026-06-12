import { Terminal } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from './QueryBuilderPlaceholder.module.scss';

/**
 * Placeholder for the query builder in the panel editor's left pane. Milestone 2
 * replaces this with the shared `QueryBuilderV2`, wired through `fromPerses` /
 * `toPerses` so query edits flow into the draft and re-fetch the preview.
 */
function QueryBuilderPlaceholder(): JSX.Element {
	return (
		<div
			className={styles.placeholder}
			data-testid="panel-editor-v2-query-placeholder"
		>
			<Terminal size={16} />
			<Typography.Text>Query builder coming soon</Typography.Text>
		</div>
	);
}

export default QueryBuilderPlaceholder;
