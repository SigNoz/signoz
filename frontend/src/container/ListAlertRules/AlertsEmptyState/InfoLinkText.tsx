import { ArrowRight, CirclePlay } from '@signozhq/icons';
import { Flex } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { openInNewTab } from 'utils/navigation';

import styles from './AlertsEmptyState.module.scss';

interface InfoLinkTextProps {
	infoText: string;
	link: string;
	leftIconVisible: boolean;
	rightIconVisible: boolean;
	onClick: () => void;
}

function InfoLinkText({
	infoText,
	link,
	leftIconVisible,
	rightIconVisible,
	onClick,
}: InfoLinkTextProps): JSX.Element {
	return (
		<Flex
			onClick={(): void => {
				onClick();
				openInNewTab(link);
			}}
			className={styles.infoLinkContainer}
		>
			{leftIconVisible && <CirclePlay size="md" />}
			<Typography.Text className={styles.infoText}>{infoText}</Typography.Text>
			{rightIconVisible && (
				<ArrowRight size="md" style={{ transform: 'rotate(315deg)' }} />
			)}
		</Flex>
	);
}

export default InfoLinkText;
