import { useTranslation } from 'react-i18next';
import { Callout } from '@signozhq/ui/callout';
import Spinner from 'components/Spinner';

import ChannelFormBody from './ChannelFormBody';
import styles from './ChannelForm.module.scss';
import { useChannelDraft } from './useChannelDraft';

interface ChannelFormProps {
	channelId?: string;
	onDone: () => void;
}

function ChannelForm({ channelId, onDone }: ChannelFormProps): JSX.Element {
	const { t } = useTranslation('channels');
	const { draft, isLoading, loadError } = useChannelDraft(channelId);

	if (loadError) {
		return (
			<Callout
				type="error"
				showIcon
				title={t('channel_load_failed')}
				className={styles.loadError}
				testId="channel-load-error"
			>
				{loadError}
			</Callout>
		);
	}

	if (isLoading || !draft) {
		return <Spinner tip={t('loading_channels_message')} />;
	}

	return (
		<ChannelFormBody
			draft={draft}
			target={channelId ? { mode: 'edit', channelId } : { mode: 'create' }}
			onDone={onDone}
		/>
	);
}

export default ChannelForm;
