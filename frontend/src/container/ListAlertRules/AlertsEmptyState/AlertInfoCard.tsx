/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { ArrowRightOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

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
				window.open(link, '_blank');
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
