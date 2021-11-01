import { GlobalTime } from 'types/actions/globalTime';
import { Widgets } from 'types/api/dashboard/getAll';

const GetMaxMinTime = ({
	graphType,
	minTime,
	maxTime,
}: GetMaxMinProps): GlobalTime => {
	if (graphType === 'VALUE') {
		return {
			maxTime: maxTime,
			minTime: maxTime,
		};
	}
	return {
		maxTime: maxTime,
		minTime: minTime,
	};
};

interface GetMaxMinProps {
	graphType: Widgets['panelTypes'];
	maxTime: GlobalTime['maxTime'];
	minTime: GlobalTime['minTime'];
}

export default GetMaxMinTime;
