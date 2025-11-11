import axios from 'api';
import { AxiosError } from 'axios';
import { SuccessResponse } from 'types/api';
import { UpdateCustomFiltersProps } from 'types/api/quickFilters/updateCustomFilters';

const updateCustomFiltersAPI = async (
	props: UpdateCustomFiltersProps,
): Promise<SuccessResponse<void> | AxiosError> =>
	axios.put(`/orgs/me/filters`, {
		...props.data,
	});

export default updateCustomFiltersAPI;
