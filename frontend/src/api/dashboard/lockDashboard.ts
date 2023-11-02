import axios from 'api';
import { ApiResponse } from 'types/api';
import { Props } from 'types/api/dashboard/get';
import { Dashboard } from 'types/api/dashboard/getAll';

const lockDashboard = (props: Props): Promise<Dashboard> =>
	axios
		.get<ApiResponse<any>>(`/dashboards/${props.uuid}/lock`)
		.then((res) => res.data.data)
		.catch((err) => {
			console.log(err);
		});

export default lockDashboard;
