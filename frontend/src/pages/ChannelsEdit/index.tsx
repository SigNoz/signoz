import { matchPath, Redirect, useLocation } from 'react-router-dom';
import ROUTES from 'constants/routes';

import ChannelsEditPage from './ChannelsEditPage';

function ChannelsEdit(): JSX.Element {
	const { pathname } = useLocation();
	const channelId = matchPath<{ channelId: string }>(pathname, {
		path: ROUTES.CHANNELS_EDIT,
	})?.params?.channelId;

	if (!channelId) {
		return <Redirect to={ROUTES.ALL_CHANNELS} />;
	}

	return <ChannelsEditPage channelId={channelId} />;
}

export default ChannelsEdit;
