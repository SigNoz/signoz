import { ArrowRightOutlined, PlayCircleFilled } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import { openExternalLink } from 'utils/navigation';

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
				openExternalLink(link);
			}}
			className="info-link-container"
		>
			{leftIconVisible && <PlayCircleFilled />}
			<Typography.Text className="info-text">{infoText}</Typography.Text>
			{rightIconVisible && <ArrowRightOutlined rotate={315} />}
		</Flex>
	);
}

export default InfoLinkText;
