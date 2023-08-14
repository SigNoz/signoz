import { Input } from 'antd';
import React, { Dispatch, SetStateAction, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

function PipelinesSearchSection({
	setPipelineSearchValue,
}: PipelinesSearchSectionProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);

	const onSeachHandler = useCallback(
		(event: React.SetStateAction<string>) => {
			setPipelineSearchValue(event);
		},
		[setPipelineSearchValue],
	);

	return (
		<Input.Search
			allowClear
			placeholder={t('search_pipeline_placeholder')}
			onSearch={onSeachHandler}
		/>
	);
}

interface PipelinesSearchSectionProps {
	setPipelineSearchValue: Dispatch<SetStateAction<string>>;
}

export default PipelinesSearchSection;
