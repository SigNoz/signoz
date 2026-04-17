import { Typography } from 'antd';
import eyesEmojiUrl from 'assets/Images/eyesEmoji.svg';

import './QueryCancelledPlaceholder.styles.scss';

interface QueryCancelledPlaceholderProps {
	subText?: string;
}

function QueryCancelledPlaceholder({
	subText,
}: QueryCancelledPlaceholderProps): JSX.Element {
	return (
		<div className="query-cancelled-placeholder">
			<img
				className="query-cancelled-placeholder__emoji"
				src={eyesEmojiUrl}
				alt="eyes emoji"
			/>
			<Typography className="query-cancelled-placeholder__text">
				Query cancelled.
				<span className="query-cancelled-placeholder__sub-text">
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
