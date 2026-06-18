import { Spline } from '@signozhq/icons';
import { PANEL_TYPES } from 'constants/queryBuilder';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import { EQueryType } from 'types/common/dashboard';

interface PlotTagProps {
	/** Authoring mode of the panel's query; undefined when no query exists yet. */
	queryType: EQueryType | undefined;
	panelType: PANEL_TYPES;
	className?: string;
}

/**
 * "Plotted with <query mode>" chip for the editor preview — the V2 counterpart
 * of V1's WidgetGraph/PlotTag (duplicated into V2 land per the split policy).
 * Hidden for list panels (the mode is irrelevant there) and before a query is
 * configured, mirroring V1's guard instead of hardcoding the builder.
 */
function PlotTag({
	queryType,
	panelType,
	className,
}: PlotTagProps): JSX.Element | null {
	if (queryType === undefined || panelType === PANEL_TYPES.LIST) {
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
