import { Select } from 'antd';
import { getFormattedEndPointDropDownData } from 'container/ApiMonitoring/utils';
import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

interface EndPointsDropDownProps {
	selectedEndPointName?: string;
	setSelectedEndPointName: (value: string) => void;
	endPointDropDownDataQuery: UseQueryResult<SuccessResponse<any>, unknown>;
}

const defaultProps = {
	selectedEndPointName: '',
};

function EndPointsDropDown({
	selectedEndPointName,
	setSelectedEndPointName,
	endPointDropDownDataQuery,
}: EndPointsDropDownProps): JSX.Element {
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
			value={selectedEndPointName || undefined}
			placeholder="Select endpoint"
			loading={isLoading || isFetching}
			style={{ width: '100%' }}
			onChange={handleChange}
			options={formattedData}
		/>
	);
}

EndPointsDropDown.defaultProps = defaultProps;

export default EndPointsDropDown;
