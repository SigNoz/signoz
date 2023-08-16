import { Typography } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Link } from 'react-router-dom';

import { DocCardContainer } from './styles';
import { TGetStartedContentDoc } from './types';
import UTMParams from './utmParams';

interface IDocCardProps {
	text: TGetStartedContentDoc['title'];
	icon: TGetStartedContentDoc['icon'];
	url: TGetStartedContentDoc['url'];
}
function DocCard({ icon, text, url }: IDocCardProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<Link to={{ pathname: `${url}${UTMParams}` }} target="_blank">
			<DocCardContainer isDarkMode={isDarkMode}>
				<span style={{ color: isDarkMode ? '#ddd' : '#333' }}>{icon}</span>
				<Typography.Text style={{ marginLeft: '0.5rem' }}>{text}</Typography.Text>
			</DocCardContainer>
		</Link>
	);
}

export default DocCard;
