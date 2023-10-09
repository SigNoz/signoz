import './styles.scss';

import { Form } from 'antd';
import { initialQueryBuilderFormValuesMap } from 'constants/queryBuilder';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import isEqual from 'lodash-es/isEqual';
import { useTranslation } from 'react-i18next';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { ProcessorFormField } from '../../../AddNewProcessor/config';
import { formValidationRules } from '../../../config';
import LogsFilterPreview from '../../../Preview/LogsFilterPreview';
import { FormLabelStyle } from '../../styles';

function TagFilterInput({
	value,
	onChange,
	placeholder,
}: TagFilterInputProps): JSX.Element {
	const query = { ...initialQueryBuilderFormValuesMap.logs };
	if (value) {
		query.filters = value;
	}

	const onQueryChange = (newValue: TagFilter): void => {
		// Avoid unnecessary onChange calls
		if (!isEqual(newValue, query.filters)) {
			onChange(newValue);
		}
	};

	return (
		<QueryBuilderSearch
			query={query}
			onChange={onQueryChange}
			placeholder={placeholder}
		/>
	);
}

interface TagFilterInputProps {
	onChange: (filter: TagFilter) => void;
	value: TagFilter;
	placeholder: string;
}

function TagFilterInputWithLogsResultPreview({
	value,
	onChange,
	placeholder,
}: TagFilterInputProps): JSX.Element {
	return (
		<>
			<TagFilterInput
				placeholder={placeholder}
				value={value}
				onChange={onChange}
			/>
			<div className="pipeline-filter-input-preview-container">
				<LogsFilterPreview filter={value} />
			</div>
		</>
	);
}

function FilterInput({ fieldData }: FilterInputProps): JSX.Element {
	const { t } = useTranslation('pipeline');
	return (
		<Form.Item
			required={false}
			label={<FormLabelStyle>{fieldData.fieldName}</FormLabelStyle>}
			key={fieldData.id}
			rules={formValidationRules}
			name={fieldData.name}
		>
			{/* Antd form will supply value and onChange here.
      // @ts-ignore */}
			<TagFilterInputWithLogsResultPreview
				placeholder={t(fieldData.placeholder)}
			/>
		</Form.Item>
	);
}
interface FilterInputProps {
	fieldData: ProcessorFormField;
}
export default FilterInput;
