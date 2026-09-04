import { Typography } from '@signozhq/ui/typography';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';

import styles from './NoResultsState.module.scss';

interface Props {
	title: string;
	description?: string;
}

function NoResultsState({ title, description }: Props): JSX.Element {
	return (
		<div className={styles.wrapper}>
			<img src={emptyStateUrl} alt="" height={32} width={32} />
			<Typography.Text className={styles.title}>{title}</Typography.Text>
			{description && (
				<Typography.Text className={styles.description}>
					{description}
				</Typography.Text>
			)}
		</div>
	);
}

export default NoResultsState;
