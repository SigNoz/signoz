import { ArrowRightOutlined, PlayCircleFilled } from '@ant-design/icons';
import { Flex, Typography } from 'antd';

interface InfoLinkTextProps {
	infoText: string;
	link: string;
	leftIconVisible: boolean;
	rightIconVisible: boolean;
}

function InfoLinkText({
	infoText,
	link,
	leftIconVisible,
	rightIconVisible,
}: InfoLinkTextProps): JSX.Element {
	return (
		<Flex
			onClick={(): void => {
				window.open(link, '_blank');
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
