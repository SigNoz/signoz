import { Select } from 'antd';
import { getFormattedEndPointDropDownData } from 'container/ApiMonitoring/utils';
import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

function EndPointsDropDown({
	selectedEndPointName,
	setSelectedEndPointName,
	endPointDropDownDataQuery,
}: {
	selectedEndPointName: string;
	setSelectedEndPointName: (value: string) => void;
	endPointDropDownDataQuery: UseQueryResult<SuccessResponse<any>, unknown>;
}): JSX.Element {
	const { data, isLoading, isFetching } = endPointDropDownDataQuery;

	const handleChange = (value: string): void => {
		setSelectedEndPointName(value);
	};

	const formattedData = useMemo(
		() =>
			getFormattedEndPointDropDownData(data?.payload.data.result[0].table.rows),
		[data?.payload.data.result],
	);

	return (
		<Select
			placeholder="Select endpoint"
			loading={isLoading || isFetching}
			defaultValue={selectedEndPointName || ''}
			style={{ width: 120 }}
			onChange={handleChange}
			options={formattedData}
		/>
	);
}

export default EndPointsDropDown;
