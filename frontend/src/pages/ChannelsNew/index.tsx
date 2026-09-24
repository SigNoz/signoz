import AlertBreadcrumb from 'components/AlertBreadcrumb';
import ROUTES from 'constants/routes';
import CreateAlertChannels from 'container/CreateAlertChannels';
import { ChannelType } from 'container/CreateAlertChannels/config';
import styles from './styles.module.scss';

function ChannelsNew(): JSX.Element {
	return (
		<>
			<AlertBreadcrumb
				items={[
					{ title: 'Channels', route: ROUTES.ALL_CHANNELS },
					{ title: 'New Channel', isLast: true },
				]}
			/>
			<div className={styles.content}>
				<CreateAlertChannels preType={ChannelType.Slack} />
			</div>
		</>
	);
}

export default ChannelsNew;
