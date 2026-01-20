import './Error.styles.scss';

import { Tooltip, Typography } from 'antd';
import { AxiosError } from 'axios';

interface IErrorProps {
	error: AxiosError;
}

function Error(props: IErrorProps): JSX.Element {
	const { error } = props;

	return (
		<div className="error-flamegraph">
			<img
				src="/Icons/no-data.svg"
				alt="error-flamegraph"
				className="error-flamegraph-img"
			/>
			<Tooltip title={error?.message}>
				<Typography.Text className="no-data-text">
					{error?.message || 'Something went wrong!'}
				</Typography.Text>
			</Tooltip>
		</div>
	);
}

export default Error;
