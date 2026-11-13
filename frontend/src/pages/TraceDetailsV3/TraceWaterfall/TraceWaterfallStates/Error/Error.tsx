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
			<span className={styles.text}>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					Something went wrong!
				</Typography>
			</span>
			<Tooltip title={error?.message}>
				<div className={styles.value} title={error?.message}>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="p"
						textOverflow="ellipsis"
					>
						{error?.message}
					</Typography>
				</div>
			</Tooltip>
		</div>
	);
}

export default Error;
