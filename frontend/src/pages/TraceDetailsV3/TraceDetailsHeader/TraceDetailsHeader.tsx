import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@signozhq/ui';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { ArrowLeft } from 'lucide-react';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import { TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

import Filters from '../TraceWaterfall/TraceWaterfallStates/Success/Filters/Filters';

import './TraceDetailsHeader.styles.scss';

interface FilterMetadata {
	startTime: number;
	endTime: number;
	traceId: string;
}

interface TraceDetailsHeaderProps {
	filterMetadata: FilterMetadata;
	onFilteredSpansChange: (spanIds: string[], isFilterActive: boolean) => void;
	noData?: boolean;
}

function TraceDetailsHeader({
	filterMetadata,
	onFilteredSpansChange,
	noData,
}: TraceDetailsHeaderProps): JSX.Element {
	const { id: traceID } = useParams<TraceDetailV2URLProps>();

	const handleSwitchToOldView = useCallback((): void => {
		const oldUrl = `/trace-old/${traceID}${window.location.search}`;
		history.replace(oldUrl);
	}, [traceID]);

	const handlePreviousBtnClick = useCallback((): void => {
		const isSpaNavigate =
			document.referrer &&
			// oxlint-disable-next-line signoz/no-raw-absolute-path
			new URL(document.referrer).origin === window.location.origin;
		const hasBackHistory = window.history.length > 1;

		if (isSpaNavigate && hasBackHistory) {
			history.goBack();
		} else {
			history.push(ROUTES.TRACES_EXPLORER);
		}
	}, []);

	return (
		<div className="trace-details-header">
			<Button
				variant="solid"
				color="secondary"
				size="sm"
				className="trace-details-header__back-btn"
				onClick={handlePreviousBtnClick}
			>
				<ArrowLeft size={14} />
			</Button>
			<KeyValueLabel
				badgeKey="Trace ID"
				badgeValue={traceID || ''}
				maxCharacters={100}
			/>
			{!noData && (
				<>
					<div className="trace-details-header__filter">
						<Filters
							startTime={filterMetadata.startTime}
							endTime={filterMetadata.endTime}
							traceID={filterMetadata.traceId}
							onFilteredSpansChange={onFilteredSpansChange}
						/>
					</div>
					<Button
						variant="solid"
						color="secondary"
						size="sm"
						className="trace-details-header__old-view-btn"
						onClick={handleSwitchToOldView}
					>
						Old View
					</Button>
				</>
			)}
		</div>
	);
}

export default TraceDetailsHeader;
