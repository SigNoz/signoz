import { Tooltip, Typography } from 'antd';
import { AxiosError } from 'axios';

import './Error.styles.scss';

interface IErrorProps {
	error: AxiosError;
}

function Error(props: IErrorProps): JSX.Element {
	const { error } = props;

	return (
		<div className="error-waterfall">
			<Typography.Text className="text">Something went wrong!</Typography.Text>
			<Tooltip title={error?.message}>
				<Typography.Text className="value" ellipsis>
					{error?.message}
				</Typography.Text>
			</Tooltip>
		</div>
	);
}

export default Error;
