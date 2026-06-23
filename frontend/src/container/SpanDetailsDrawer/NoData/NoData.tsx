import { Typography } from '@signozhq/ui/typography';

import noDataUrl from '@/assets/Icons/no-data.svg';

import './NoData.styles.scss';

interface INoDataProps {
	name: string;
}

function NoData(props: INoDataProps): JSX.Element {
	const { name } = props;

	return (
		<div className="no-data">
			<img src={noDataUrl} alt="no-data" className="no-data-img" />
			<Typography.Text className="no-data-text">
				No {name} found for selected span
			</Typography.Text>
		</div>
	);
}

export default NoData;
