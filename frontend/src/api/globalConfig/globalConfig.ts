import axios from 'api';
import { AxiosResponse } from 'axios';
import { GlobalConfigDataProps } from 'types/api/globalConfig/types';

export const getGlobalConfig = (): Promise<
	AxiosResponse<GlobalConfigDataProps>
> => axios.get(`/global/config`);
