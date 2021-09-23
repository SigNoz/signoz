import axios from 'axios';
import { ENVIRONMENT } from 'constants/env';

import apiV1 from './apiV1';

export default axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV1}`,
});

export { apiV1 };
