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
			<Typography
				variant="paragraph"
				size="medium"
				weight="medium"
				color="main"
				as="span"
				textOverflow="wrap"
			>
				{title}
			</Typography>
			{description && (
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="tertiary"
					as="span"
					display="inline-block"
					align="center"
					textOverflow="wrap"
				>
					{description}
				</Typography>
			)}
		</div>
	);
}

export default NoResultsState;
