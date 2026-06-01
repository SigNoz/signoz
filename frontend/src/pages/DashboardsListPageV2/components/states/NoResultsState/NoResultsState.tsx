import { Typography } from '@signozhq/ui/typography';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';

import styles from './NoResultsState.module.scss';

interface Props {
	searchString: string;
}

function NoResultsState({ searchString }: Props): JSX.Element {
	return (
		<div className={styles.wrapper}>
			<img src={emptyStateUrl} alt="img" height={32} width={32} />
			<Typography.Text>
				No dashboards found for {searchString}. Create a new dashboard?
			</Typography.Text>
		</div>
	);
}

export default NoResultsState;
