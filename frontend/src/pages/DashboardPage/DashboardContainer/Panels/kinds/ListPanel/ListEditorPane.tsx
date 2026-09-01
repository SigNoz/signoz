import type { QueryEditorPaneProps } from '../../types/panelDefinition';
import ListColumnsEditor from '../../../PanelEditor/ListColumnsEditor/ListColumnsEditor';
import PanelEditorQueryBuilder from '../../../PanelEditor/PanelEditorQueryBuilder/PanelEditorQueryBuilder';

/**
 * List's editor pane: the query builder with the columns editor pinned below it.
 * Declared here so no editor host carries a List special case.
 */
function ListEditorPane({
	panelDefinition,
	signal,
	isLoadingQueries,
	onStageRunQuery,
	onCancelQuery,
	stickyHeader,
	spec,
	onChangeSpec,
}: QueryEditorPaneProps): JSX.Element {
	return (
		<PanelEditorQueryBuilder
			panelDefinition={panelDefinition}
			signal={signal}
			isLoadingQueries={isLoadingQueries}
			onStageRunQuery={onStageRunQuery}
			onCancelQuery={onCancelQuery}
			stickyHeader={stickyHeader}
			footer={
				<ListColumnsEditor spec={spec} onChangeSpec={onChangeSpec} signal={signal} />
			}
		/>
	);
}

export default ListEditorPane;
