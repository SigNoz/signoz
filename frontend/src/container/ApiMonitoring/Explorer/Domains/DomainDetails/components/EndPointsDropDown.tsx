import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { getFormattedEndPointDropDownData } from 'container/ApiMonitoring/utils';
import { SuccessResponse } from 'types/api';

interface EndPointsDropDownProps {
	selectedEndPointName?: string;
	setSelectedEndPointName: (value: string) => void;
	endPointDropDownDataQuery: UseQueryResult<SuccessResponse<any>, unknown>;
	parentContainerDiv?: string;
	dropdownStyle?: React.CSSProperties;
}

const defaultProps = {
	selectedEndPointName: '',
	parentContainerDiv: '',
	dropdownStyle: {},
};

function EndPointsDropDown({
	selectedEndPointName,
	setSelectedEndPointName,
	endPointDropDownDataQuery,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	parentContainerDiv: _parentContainerDiv,
	dropdownStyle,
}: EndPointsDropDownProps): JSX.Element {
	const { data, isLoading, isFetching } = endPointDropDownDataQuery;

	const handleChange = (value: string | string[]): void => {
		setSelectedEndPointName(value as string);
	};

	const formattedData = useMemo(
		() =>
			getFormattedEndPointDropDownData(
				data?.payload.data.result[0].table.rows,
			) as ComboboxSimpleItem[],
		[data?.payload.data.result],
	);

	return (
		<ComboboxSimple
			value={selectedEndPointName || undefined}
			placeholder="Select endpoint"
			loading={isLoading || isFetching}
			style={{ width: '100%', ...dropdownStyle }}
			onChange={handleChange}
			items={formattedData}
			virtualized
		/>
	);
}

EndPointsDropDown.defaultProps = defaultProps;

export default EndPointsDropDown;
