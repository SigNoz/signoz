import { Input } from 'antd';
import { debounce } from 'lodash-es';
import { BaseSyntheticEvent, Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

function PipelinesSearchSection({
	setPipelineSearchValue,
}: PipelinesSearchSectionProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);

	const handleSearch = (searchEv: BaseSyntheticEvent): void => {
		setPipelineSearchValue(searchEv?.target?.value || '');
	};

	const debouncedHandleSearch = debounce(handleSearch, 300);

	return (
		<Input
			type="text"
			allowClear
			placeholder={t('search_pipeline_placeholder')}
			onChange={debouncedHandleSearch}
		/>
	);
}

interface PipelinesSearchSectionProps {
	setPipelineSearchValue: Dispatch<SetStateAction<string>>;
}

export default PipelinesSearchSection;
