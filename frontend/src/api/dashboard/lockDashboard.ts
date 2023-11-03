import axios from 'api';
import { AxiosResponse } from 'axios';

const lockDashboard = (props: any): Promise<AxiosResponse> =>
	axios.put(`/dashboards/${props.uuid}/lock`);

export default lockDashboard;
