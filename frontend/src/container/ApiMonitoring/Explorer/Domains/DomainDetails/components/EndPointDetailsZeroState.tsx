import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

import EndPointsDropDown from './EndPointsDropDown';

function EndPointDetailsZeroState({
	endPointName,
	setSelectedEndPointName,
	endPointDropDownDataQuery,
}: {
	endPointName: string;
	setSelectedEndPointName: (endPointName: string) => void;
	endPointDropDownDataQuery: UseQueryResult<SuccessResponse<any>>;
}): JSX.Element {
	return (
		<div className="end-point-details-zero-state-wrapper">
			<div className="end-point-details-zero-state-icon">Icon</div>
			<div className="end-point-details-zero-state-content-wrapper">
				<div className="end-point-details-zero-state-content">
					<div className="title">No endpoint selected yet</div>
					<div className="description">Select an endpoint to see the details</div>
				</div>
				<EndPointsDropDown
					selectedEndPointName={endPointName}
					setSelectedEndPointName={setSelectedEndPointName}
					endPointDropDownDataQuery={endPointDropDownDataQuery}
				/>
			</div>
		</div>
	);
}

export default EndPointDetailsZeroState;
