import { GatewayApiV2Instance as axios } from 'api';
import { AxiosError } from 'axios';
import { SuccessResponse } from 'types/api';
import {
	PayloadProps,
	UpdateCustomDomainProps,
} from 'types/api/customDomain/types';

const updateSubDomainAPI = async (
	props: UpdateCustomDomainProps,
): Promise<SuccessResponse<PayloadProps> | AxiosError> =>
	axios.put(`/deployments/me/host`, {
		...props.data,
	});

export default updateSubDomainAPI;
