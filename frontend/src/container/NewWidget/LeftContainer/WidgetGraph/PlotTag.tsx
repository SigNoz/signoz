import { EQueryType } from 'types/common/dashboard';

import QueryTypeTag from '../QueryTypeTag';

interface IPlotTagProps {
	queryType: EQueryType;
}

function PlotTag({ queryType }: IPlotTagProps): JSX.Element | null {
	if (queryType === undefined) {
		return null;
	}

	return (
		<div style={{ marginLeft: '2rem', position: 'absolute', top: '1rem' }}>
			Plotted using <QueryTypeTag queryType={queryType} />
		</div>
	);
}

export default PlotTag;
