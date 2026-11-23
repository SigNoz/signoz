import { PANEL_TYPES } from 'constants/queryBuilder';
import type { GlobalTime } from 'types/actions/globalTime';
import type { Widgets } from 'types/api/widgets/widget';

const GetMaxMinTime = ({
	graphType,
	minTime,
	maxTime,
}: GetMaxMinProps): GlobalTime => {
	if (graphType === PANEL_TYPES.VALUE) {
		return {
			maxTime,
			minTime: maxTime,
		};
	}
	return {
		maxTime,
		minTime,
	};
};

interface GetMaxMinProps {
	graphType: Widgets['panelTypes'] | null;
	maxTime: GlobalTime['maxTime'];
	minTime: GlobalTime['minTime'];
}

export default GetMaxMinTime;
