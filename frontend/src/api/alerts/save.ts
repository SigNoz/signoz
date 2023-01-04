import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/alerts/save';

import create from './create';
import put from './put';

const save = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	if (props.id && props.id > 0) {
		return put({ ...props });
	}

	return create({ ...props });
};

export default save;
