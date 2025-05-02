import './NoData.styles.scss';

import { Typography } from 'antd';

interface INoDataProps {
	name: string;
}

function NoData(props: INoDataProps): JSX.Element {
	const { name } = props;

	return (
		<div className="no-data">
			<img src="/Icons/no-data.svg" alt="no-data" className="no-data-img" />
			<Typography.Text className="no-data-text">
				No {name} found for selected span
			</Typography.Text>
		</div>
	);
}

export default NoData;
