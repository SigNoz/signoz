import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { AxiosError } from 'axios';

import styles from './Error.module.scss';

interface IErrorProps {
	error: AxiosError;
}

function Error(props: IErrorProps): JSX.Element {
	const { error } = props;

	return (
		<div className={styles.root}>
			<Typography.Text className={styles.text}>
				Something went wrong!
			</Typography.Text>
			<Tooltip title={error?.message}>
				<Typography.Text
					className={styles.value}
					title={error?.message}
					truncate={1}
				>
					{error?.message}
				</Typography.Text>
			</Tooltip>
		</div>
	);
}

export default Error;
