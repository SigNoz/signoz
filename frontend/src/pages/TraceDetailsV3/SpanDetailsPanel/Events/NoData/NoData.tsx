import { Typography } from '@signozhq/ui/typography';

import noDataUrl from '@/assets/Icons/no-data.svg';

import styles from './NoData.module.scss';

interface INoDataProps {
	name: string;
}

function NoData(props: INoDataProps): JSX.Element {
	const { name } = props;

	return (
		<div className={styles.noData}>
			<img src={noDataUrl} alt="no-data" className={styles.noDataImg} />
			<Typography.Text className={styles.noDataText}>
				No {name} found for selected span
			</Typography.Text>
		</div>
	);
}

export default NoData;
