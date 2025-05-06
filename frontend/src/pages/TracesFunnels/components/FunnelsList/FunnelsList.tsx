import './FunnelsList.styles.scss';

import { Button } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import { CalendarClock, DecimalsArrowRight } from 'lucide-react';
import { useState } from 'react';
import { generatePath, Link } from 'react-router-dom';
import { FunnelData } from 'types/api/traceFunnels';

import FunnelItemPopover from './FunnelItemPopover';

interface FunnelListItemProps {
	funnel: FunnelData;
	onFunnelClick?: (funnel: FunnelData) => void;
	shouldRedirectToTracesListOnDeleteSuccess?: boolean;
	isSpanDetailsPage?: boolean;
}

export function FunnelListItem({
	funnel,
	onFunnelClick,
	shouldRedirectToTracesListOnDeleteSuccess,
	isSpanDetailsPage,
}: FunnelListItemProps): JSX.Element {
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
	const funnelDetailsLink = generatePath(ROUTES.TRACES_FUNNELS_DETAIL, {
		funnelId: funnel.funnel_id,
	});

	const content = (
		<>
			<div className="funnel-item__header">
				<div className="funnel-item__title">
					<div>{funnel.funnel_name}</div>
				</div>

				{isSpanDetailsPage ? (
					<Button
						type="default"
						className="funnel-item__open-button"
						icon={<DecimalsArrowRight size={12} />}
					>
						Open funnel
					</Button>
				) : (
					<FunnelItemPopover
						isPopoverOpen={isPopoverOpen}
						setIsPopoverOpen={setIsPopoverOpen}
						funnel={funnel}
						shouldRedirectToTracesListOnDeleteSuccess={
							shouldRedirectToTracesListOnDeleteSuccess
						}
					/>
				)}
			</div>

			<div className="funnel-item__details">
				<div className="funnel-item__created-at">
					<CalendarClock size={14} />
					<div>
						{dayjs(funnel.created_at).format(DATE_TIME_FORMATS.FUNNELS_LIST_DATE)}
					</div>
				</div>

				<div className="funnel-item__user">
					{funnel.user_email && (
						<div className="funnel-item__user-avatar">
							{funnel.user_email.substring(0, 1).toUpperCase()}
						</div>
					)}
					<div>{funnel.user_email}</div>
				</div>
			</div>
		</>
	);

	return onFunnelClick ? (
		<button
			type="button"
			className="funnel-item"
			onClick={(): void => onFunnelClick(funnel)}
		>
			{content}
		</button>
	) : (
		<Link to={funnelDetailsLink} className="funnel-item">
			{content}
		</Link>
	);
}

FunnelListItem.defaultProps = {
	onFunnelClick: undefined,
	shouldRedirectToTracesListOnDeleteSuccess: true,
	isSpanDetailsPage: false,
};

interface FunnelsListProps {
	data: FunnelData[];
	onFunnelClick?: (funnel: FunnelData) => void;
	shouldRedirectToTracesListOnDeleteSuccess?: boolean;
}

function FunnelsList({
	data,
	onFunnelClick,
	shouldRedirectToTracesListOnDeleteSuccess,
}: FunnelsListProps): JSX.Element {
	return (
		<div className="funnels-list">
			{data?.map((funnel) => (
				<FunnelListItem
					key={funnel.funnel_id}
					funnel={funnel}
					onFunnelClick={onFunnelClick}
					shouldRedirectToTracesListOnDeleteSuccess={
						shouldRedirectToTracesListOnDeleteSuccess
					}
				/>
			))}
		</div>
	);
}

FunnelsList.defaultProps = {
	onFunnelClick: undefined,
	shouldRedirectToTracesListOnDeleteSuccess: true,
};

export default FunnelsList;
