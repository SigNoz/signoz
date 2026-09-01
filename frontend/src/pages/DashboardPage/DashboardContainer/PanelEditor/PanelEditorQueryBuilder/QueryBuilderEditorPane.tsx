import type { QueryEditorPaneProps } from '../../Panels/types/panelDefinition';
import PanelEditorQueryBuilder from './PanelEditorQueryBuilder';

/**
 * The default query-kind editor pane: the query-builder tabs with no extras. A
 * kind that needs more (e.g. List's columns editor) declares its own wrapper.
 */
function QueryBuilderEditorPane({
	panelDefinition,
	signal,
	isLoadingQueries,
	onStageRunQuery,
	onCancelQuery,
	stickyHeader,
}: QueryEditorPaneProps): JSX.Element {
	return (
		<PanelEditorQueryBuilder
			panelDefinition={panelDefinition}
			signal={signal}
			isLoadingQueries={isLoadingQueries}
			onStageRunQuery={onStageRunQuery}
			onCancelQuery={onCancelQuery}
			stickyHeader={stickyHeader}
		/>
	);
}

export default QueryBuilderEditorPane;
