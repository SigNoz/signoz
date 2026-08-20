import { Spline } from '@signozhq/icons';
import QueryTypeTag from 'components/QueryTypeTag/QueryTypeTag';
import { EQueryType } from 'types/common/dashboard';

interface PlotTagProps {
	/** Authoring mode of the panel's query; undefined when no query exists yet. */
	queryType: EQueryType | undefined;
	/**
	 * Panel shows raw rows rather than a plot, so naming the mode the rows were
	 * "plotted with" would be wrong.
	 */
	isListViewPanel: boolean;
	className?: string;
}

/**
 * "Plotted with <query mode>" chip for the editor preview; V2 counterpart of V1's
 * PlotTag (duplicated per the split policy). Hidden for list panels and before a
 * query exists, where the mode is irrelevant.
 */
function PlotTag({
	queryType,
	isListViewPanel,
	className,
}: PlotTagProps): JSX.Element | null {
	if (queryType === undefined || isListViewPanel) {
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
