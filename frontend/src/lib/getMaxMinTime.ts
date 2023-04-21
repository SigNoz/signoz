import { GlobalTime } from 'types/actions/globalTime';
import { Widgets } from 'types/api/dashboard/getAll';

const GetMaxMinTime = ({
	graphType,
	minTime,
	maxTime,
}: GetMaxMinProps): GlobalTime => {
	if (graphType === 'value') {
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
