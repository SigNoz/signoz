import { red } from '@ant-design/colors';
import {
    CloseCircleFilled,
    CloseOutlined,
    PlusCircleFilled,
    PlusCircleOutlined,
} from '@ant-design/icons';
import { Input } from 'antd';
import AddToSelectedFields from 'api/logs/AddToSelectedField';
import RemoveSelectedField from 'api/logs/RemoveFromSelectedField';
import CategoryHeading from 'components/Logs/CategoryHeading';
import React, { memo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetLogsFields } from 'store/actions/logs/getFields';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import ILogsReducer from 'types/reducer/logs';

import { FieldItem } from './FieldItem';
import {
    CategoryContainer,
    Container,
    ExtractField,
    Field,
    FieldContainer,
} from './styles';

const { Search } = Input;

function LogsFilters({ getLogsFields }) {
    const {
        fields: { interesting, selected },
    } = useSelector<AppState, ILogsReducer>((state) => state.logs);

    const [selectedFieldLoading, setSelectedFieldLoading] = useState([]);
    const [interestingFieldLoading, setInterestingFieldLoading] = useState([]);

    const onSearch = () => { };

    const handleAddInterestingToSelected = async ({ fieldData, fieldIndex }) => {
        setInterestingFieldLoading((prevState) => {
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
    const handleRemoveSelectedField = async ({ fieldData, fieldIndex }) => {
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
        <Container>
            <Search
                placeholder="Filter Values"
                onSearch={onSearch}
                style={{ width: '100%' }}
            />

            <CategoryContainer>
                <CategoryHeading>SELECTED FIELDS</CategoryHeading>
                <FieldContainer>
                    {selected.map((field, idx) => (
                        <FieldItem
                            key={field + idx}
                            name={field.name}
                            fieldData={field}
                            fieldIndex={idx}
                            buttonIcon={<CloseOutlined style={{ color: red[5] }} />}
                            buttonOnClick={handleRemoveSelectedField}
                            isLoading={selectedFieldLoading.includes(idx)}
                        />
                    ))}
                </FieldContainer>
            </CategoryContainer>
            <CategoryContainer>
                <CategoryHeading>INTERESTING FIELDS</CategoryHeading>
                <FieldContainer>
                    {interesting.map((field, idx) => (
                        <FieldItem
                            key={field + idx}
                            name={field.name}
                            fieldData={field}
                            fieldIndex={idx}
                            buttonIcon={<PlusCircleFilled />}
                            buttonOnClick={handleAddInterestingToSelected}
                            isLoading={interestingFieldLoading.includes(idx)}
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

export default connect(null, mapDispatchToProps)(memo(LogsFilters));
