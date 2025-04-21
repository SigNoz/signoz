import './FunnelsList.styles.scss';

import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import { CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { generatePath, Link } from 'react-router';
import { FunnelData } from 'types/api/traceFunnels';

import FunnelItemPopover from './FunnelItemPopover';

interface FunnelListItemProps {
	funnel: FunnelData;
}

function FunnelListItem({ funnel }: FunnelListItemProps): JSX.Element {
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
	const funnelDetailsLink = generatePath(ROUTES.TRACES_FUNNELS_DETAIL, {
		funnelId: funnel.id,
	});

	return (
		<Link to={funnelDetailsLink} className="funnel-item">
			<div className="funnel-item__header">
				<div className="funnel-item__title">
					<div>{funnel.funnel_name}</div>
				</div>
				<FunnelItemPopover
					isPopoverOpen={isPopoverOpen}
					setIsPopoverOpen={setIsPopoverOpen}
					funnel={funnel}
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
		</Link>
	);
}

interface FunnelsListProps {
	data: FunnelData[];
}

function FunnelsList({ data }: FunnelsListProps): JSX.Element {
	return (
		<div className="funnels-list">
			{data.map((funnel) => (
				<FunnelListItem key={funnel.id} funnel={funnel} />
			))}
		</div>
	);
}

export default FunnelsList;
