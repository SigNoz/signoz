/* eslint-disable react/no-array-index-key */
import { red } from '@ant-design/colors';
import { CloseOutlined, PlusCircleFilled } from '@ant-design/icons';
import { Input } from 'antd';
import AddToSelectedFields from 'api/logs/AddToSelectedField';
import RemoveSelectedField from 'api/logs/RemoveFromSelectedField';
import CategoryHeading from 'components/Logs/CategoryHeading';
import { fieldSearchFilter } from 'lib/logs/fieldSearch';
import React, { memo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetLogsFields } from 'store/actions/logs/getFields';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { IInterestingFields, ISelectedFields } from 'types/api/logs/fields';
import { ILogsReducer } from 'types/reducer/logs';

import { FieldItem } from './FieldItem';
import { CategoryContainer, Container, FieldContainer } from './styles';

const RESTRICTED_SELECTED_FIELDS = ['timestamp', 'id'];

function LogsFilters({ getLogsFields }: LogsFiltersProps): JSX.Element {
	const {
		fields: { interesting, selected },
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

	const [selectedFieldLoading, setSelectedFieldLoading] = useState<number[]>([]);
	const [interestingFieldLoading, setInterestingFieldLoading] = useState<
		number[]
	>([]);

	const [filterValuesInput, setFilterValuesInput] = useState('');
	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setFilterValuesInput((e.target as HTMLInputElement).value);
	};

	const handleAddInterestingToSelected = async ({
		fieldData,
		fieldIndex,
	}: {
		fieldData: IInterestingFields;
		fieldIndex: number;
	}): Promise<void> => {
		setInterestingFieldLoading((prevState: number[]) => {
			prevState.push(fieldIndex);
			return [...prevState];
		});

		await AddToSelectedFields({
			...fieldData,
			selected: true,
		});
		getLogsFields();

		setInterestingFieldLoading(
			interestingFieldLoading.filter((e) => e !== fieldIndex),
		);
	};
	const handleRemoveSelectedField = async ({
		fieldData,
		fieldIndex,
	}: {
		fieldData: ISelectedFields;
		fieldIndex: number;
	}): Promise<void> => {
		setSelectedFieldLoading((prevState) => {
			prevState.push(fieldIndex);
			return [...prevState];
		});

		await RemoveSelectedField({
			...fieldData,
			selected: false,
		});

		getLogsFields();

		setSelectedFieldLoading(
			interestingFieldLoading.filter((e) => e !== fieldIndex),
		);
	};
	return (
		<Container flex="450px">
			<Input
				placeholder="Filter Values"
				onInput={handleSearch}
				style={{ width: '100%' }}
				value={filterValuesInput}
				onChange={handleSearch}
			/>

			<CategoryContainer>
				<CategoryHeading>SELECTED FIELDS</CategoryHeading>
				<FieldContainer>
					{selected
						.filter((field) => fieldSearchFilter(field.name, filterValuesInput))
						.map((field, idx) => (
							<FieldItem
								key={`${JSON.stringify(field)}-${idx}`}
								name={field.name}
								fieldData={field as never}
								fieldIndex={idx}
								buttonIcon={<CloseOutlined style={{ color: red[5] }} />}
								buttonOnClick={
									(!RESTRICTED_SELECTED_FIELDS.includes(field.name) &&
										handleRemoveSelectedField) as never
								}
								isLoading={selectedFieldLoading.includes(idx)}
								iconHoverText="Remove from Selected Fields"
							/>
						))}
				</FieldContainer>
			</CategoryContainer>
			<CategoryContainer>
				<CategoryHeading>INTERESTING FIELDS</CategoryHeading>
				<FieldContainer>
					{interesting
						.filter((field) => fieldSearchFilter(field.name, filterValuesInput))
						.map((field, idx) => (
							<FieldItem
								key={`${JSON.stringify(field)}-${idx}`}
								name={field.name}
								fieldData={field as never}
								fieldIndex={idx}
								buttonIcon={<PlusCircleFilled />}
								buttonOnClick={handleAddInterestingToSelected as never}
								isLoading={interestingFieldLoading.includes(idx)}
								iconHoverText="Add to Selected Fields"
							/>
						))}
				</FieldContainer>
			</CategoryContainer>
			{/* <ExtractField>Extract Fields</ExtractField> */}
		</Container>
	);
}

interface DispatchProps {
	getLogsFields: () => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogsFields: bindActionCreators(GetLogsFields, dispatch),
});

type LogsFiltersProps = DispatchProps;

export default connect(null, mapDispatchToProps)(memo(LogsFilters));
