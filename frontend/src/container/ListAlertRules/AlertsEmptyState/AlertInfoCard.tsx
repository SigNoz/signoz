import { ArrowRight } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { openInNewTab } from 'utils/navigation';

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
				openInNewTab(link);
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
			<ArrowRight size="md" />
		</div>
	);
}

export default AlertInfoCard;
