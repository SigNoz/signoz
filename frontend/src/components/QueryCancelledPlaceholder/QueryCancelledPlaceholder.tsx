import { Typography } from '@signozhq/ui/typography';
import eyesEmojiUrl from 'assets/Images/eyesEmoji.svg';

import styles from './QueryCancelledPlaceholder.module.scss';

interface QueryCancelledPlaceholderProps {
	subText?: string;
}

function QueryCancelledPlaceholder({
	subText,
}: QueryCancelledPlaceholderProps): JSX.Element {
	return (
		<div className={styles.placeholder}>
			<img className={styles.emoji} src={eyesEmojiUrl} alt="eyes emoji" />
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="p"
				align="center"
				textOverflow="wrap"
			>
				Query cancelled.
				<span className={styles.subText}>
					{' '}
					{subText || 'Click "Run Query" to load data.'}
				</span>
			</Typography>
		</div>
	);
}

QueryCancelledPlaceholder.defaultProps = {
	subText: undefined,
};

export default QueryCancelledPlaceholder;
