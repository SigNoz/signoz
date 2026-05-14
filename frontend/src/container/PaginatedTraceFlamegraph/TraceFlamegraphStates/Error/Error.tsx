import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { AxiosError } from 'axios';

import noDataUrl from '@/assets/Icons/no-data.svg';

import './Error.styles.scss';

interface IErrorProps {
	error: AxiosError;
}

function Error(props: IErrorProps): JSX.Element {
	const { error } = props;

	return (
		<div className="error-flamegraph">
			<img
				src={noDataUrl}
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
