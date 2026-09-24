import { Spline } from '@signozhq/icons';
import QueryTypeTag from 'components/QueryTypeTag/QueryTypeTag';
import { EQueryType } from 'types/common/dashboard';

interface PlotTagProps {
	queryType: EQueryType | undefined;
	className?: string;
}

function PlotTag({ queryType, className }: PlotTagProps): JSX.Element | null {
	if (queryType === undefined) {
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
