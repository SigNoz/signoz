import { Spline } from '@signozhq/icons';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import { EQueryType } from 'types/common/dashboard';

interface PlotTagProps {
	/** Authoring mode of the panel's query; undefined when no query exists yet. */
	queryType: EQueryType | undefined;
	/** Kind is authored as a list view — nothing is plotted, so the chip has nothing to say. */
	isListView: boolean;
	className?: string;
}

/**
 * "Plotted with <query mode>" chip for the editor preview; V2 counterpart of V1's
 * PlotTag (duplicated per the split policy). Hidden for list views and before a
 * query exists, where the mode is irrelevant.
 */
function PlotTag({
	queryType,
	isListView,
	className,
}: PlotTagProps): JSX.Element | null {
	if (queryType === undefined || isListView) {
		return null;
	}

	return (
		<div className={className} data-testid="panel-editor-plot-tag">
			<Spline size={14} />
			Plotted with <QueryTypeTag queryType={queryType} />
		</div>
	);
}

export default PlotTag;
