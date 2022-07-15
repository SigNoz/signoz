import { Input } from 'antd';
import CategoryHeading from 'components/Logs/CategoryHeading';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import ILogsReducer from 'types/reducer/logs';

import { CategoryContainer, Container, ExtractField, Field, FieldContainer } from './styles';

const { Search } = Input;

function LogsFilters() {
    const {
        fields: { interesting, selected },
    } = useSelector<AppState, ILogsReducer>((state) => state.logs);

    const onSearch = () => { };

    return (
        <Container flex="auto">
            <Search
                placeholder="Filter Values"
                onSearch={onSearch}
                style={{ width: '100%' }}
            />

            <CategoryContainer>
                <CategoryHeading>SELECTED FIELDS</CategoryHeading>
                <FieldContainer>
                    {selected.map((field, idx) => (
                        <Field key={field + idx}>{field.name}</Field>
                    ))}
                </FieldContainer>
            </CategoryContainer>
            <CategoryContainer>
                <CategoryHeading>INTERESTING FIELDS</CategoryHeading>
                <FieldContainer>
                    {selected.map((field, idx) => (
                        <Field key={field + idx}>{field.name}</Field>
                    ))}
                </FieldContainer>
            </CategoryContainer>
            <ExtractField>
                Extract Fields
            </ExtractField>
        </Container>
    );
}
export default LogsFilters;
