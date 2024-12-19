import axios from 'api';
import { ApiResponse } from 'types/api';
import { Props } from 'types/api/dashboard/get';
import { Dashboard } from 'types/api/dashboard/getAll';

const getDashboard = (props: Props): Promise<Dashboard> =>
	axios
		.get<ApiResponse<Dashboard>>(`/dashboards/${props.uuid}`)
		.then((res) => res.data.data);

export default getDashboard;
