import axios from 'axios';
import { Payload, Props } from 'types/api/userFeedback/sendResponse';

const slackUrl =
	'https://hooks.slack.com/services/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';

const sendFeedback = async (props: Props): Promise<Payload> => {
	const response = await axios.post(
		slackUrl,
		{
			text: props.text,
		},
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		},
	);

	return response.data;
};

export default sendFeedback;
