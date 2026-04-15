import { ArrowRightOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { openExternalLink } from 'utils/navigation';

interface AlertInfoCardProps {
	header: string;
	subheader: string;
	link: string;
	onClick: () => void;
}

function AlertInfoCard({
	header,
	subheader,
	link,
	onClick,
}: AlertInfoCardProps): JSX.Element {
	return (
		<div
			className="alert-info-card"
			onClick={(): void => {
				onClick();
				openExternalLink(link);
			}}
		>
			<div className="alert-card-text">
				<Typography.Text className="alert-card-text-header">
					{header}
				</Typography.Text>
				<Typography.Text className="alert-card-text-subheader">
					{subheader}
				</Typography.Text>
			</div>
			<ArrowRightOutlined />
		</div>
	);
}

export default AlertInfoCard;
