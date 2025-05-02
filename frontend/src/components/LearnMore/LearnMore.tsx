import './LearnMore.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import { ArrowUpRight } from 'lucide-react';

type LearnMoreProps = {
	text?: string;
	url?: string;
	onClick?: () => void;
};

function LearnMore({ text, url, onClick }: LearnMoreProps): JSX.Element {
	const handleClick = (): void => {
		onClick?.();
		if (url) {
			window.open(url, '_blank');
		}
	};
	return (
		<Button type="link" className="learn-more" onClick={handleClick}>
			<div className="learn-more__text">{text}</div>
			<ArrowUpRight size={16} color={Color.BG_ROBIN_400} />
		</Button>
	);
}

LearnMore.defaultProps = {
	text: 'Learn more',
	url: '',
	onClick: (): void => {},
};

export default LearnMore;
