import axios from 'api';
import { Props } from 'types/api/userFeedback/sendResponse';

const sendFeedback = async (props: Props): Promise<number> => {
	const response = await axios.post(
		'/feedback',
		{
			email: props.email,
			message: props.message,
		},
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		},
	);

	return response.status;
};

export default sendFeedback;
