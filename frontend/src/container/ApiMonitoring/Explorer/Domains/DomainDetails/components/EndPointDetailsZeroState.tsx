import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

import EndPointsDropDown from './EndPointsDropDown';

function EndPointDetailsZeroState({
	setSelectedEndPointName,
	endPointDropDownDataQuery,
}: {
	setSelectedEndPointName: (endPointName: string) => void;
	endPointDropDownDataQuery: UseQueryResult<SuccessResponse<any>>;
}): JSX.Element {
	return (
		<div className="end-point-details-zero-state-wrapper">
			<div className="end-point-details-zero-state-content">
				<img
					src="/Icons/no-data.svg"
					alt="no-data"
					width={32}
					height={32}
					className="end-point-details-zero-state-icon"
				/>
				<div className="end-point-details-zero-state-content-wrapper">
					<div className="end-point-details-zero-state-text-content">
						<div className="title">No endpoint selected yet</div>
						<div className="description">Select an endpoint to see the details</div>
					</div>
					<EndPointsDropDown
						setSelectedEndPointName={setSelectedEndPointName}
						endPointDropDownDataQuery={endPointDropDownDataQuery}
						parentContainerDiv=".end-point-details-zero-state-wrapper"
						dropdownStyle={{ width: '60%' }}
					/>
				</div>
			</div>
		</div>
	);
}

export default EndPointDetailsZeroState;
