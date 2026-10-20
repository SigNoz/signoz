import AlertBreadcrumb from 'components/AlertBreadcrumb';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import ChannelForm from 'pages/AlertList/NotificationChannels/components/ChannelForm/ChannelForm';

import styles from './styles.module.scss';

function ChannelsNew(): JSX.Element {
	return (
		<>
			<AlertBreadcrumb
				items={[
					{ title: 'Channels', route: ROUTES.ALL_CHANNELS },
					{ title: 'New channel', isLast: true },
				]}
			/>
			<div className={styles.content}>
				<ChannelForm
					onDone={(): void => {
						history.replace(ROUTES.ALL_CHANNELS);
					}}
				/>
			</div>
		</>
	);
}

export default ChannelsNew;
