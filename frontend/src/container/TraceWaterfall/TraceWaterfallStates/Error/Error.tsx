import { Typography } from 'antd';
import { AxiosError } from 'axios';

interface IErrorProps {
	error: AxiosError;
}

function Error(props: IErrorProps): JSX.Element {
	const { error } = props;

	return (
		<>
			<Typography.Text>Error fetching trace</Typography.Text>
			<Typography.Text>{error.message}</Typography.Text>
		</>
	);
}

export default Error;
