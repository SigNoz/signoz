import './FunnelsList.styles.scss';

import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import { CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { generatePath, Link } from 'react-router-dom';
import { FunnelData } from 'types/api/traceFunnels';

import FunnelItemPopover from './FunnelItemPopover';

interface FunnelListItemProps {
	funnel: FunnelData;
	onFunnelClick?: (funnel: FunnelData) => void;
	shouldRedirectToTracesListOnDeleteSuccess?: boolean;
}

export function FunnelListItem({
	funnel,
	onFunnelClick,
	shouldRedirectToTracesListOnDeleteSuccess,
}: FunnelListItemProps): JSX.Element {
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
	const funnelDetailsLink = generatePath(ROUTES.TRACES_FUNNELS_DETAIL, {
		funnelId: funnel.id,
	});

	const content = (
		<>
			<div className="funnel-item__header">
				<div className="funnel-item__title">
					<div>{funnel.funnel_name}</div>
				</div>
				<FunnelItemPopover
					isPopoverOpen={isPopoverOpen}
					setIsPopoverOpen={setIsPopoverOpen}
					funnel={funnel}
					shouldRedirectToTracesListOnDeleteSuccess={
						shouldRedirectToTracesListOnDeleteSuccess
					}
				/>
			</div>

			<div className="funnel-item__details">
				<div className="funnel-item__created-at">
					<CalendarClock size={14} />
					<div>
						{dayjs(funnel.creation_timestamp).format(
							DATE_TIME_FORMATS.FUNNELS_LIST_DATE,
						)}
					</div>
				</div>

				<div className="funnel-item__user">
					{funnel.user && (
						<div className="funnel-item__user-avatar">
							{funnel.user.substring(0, 1).toUpperCase()}
						</div>
					)}
					<div>{funnel.user}</div>
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
			{data.map((funnel) => (
				<FunnelListItem
					key={funnel.id}
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
