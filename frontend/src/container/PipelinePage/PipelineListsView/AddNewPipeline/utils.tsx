import React from 'react';

import { pipelineFields } from '../config';
import { PipelineColumn } from '../types';
import DescriptionTextArea from './FormFields/DescriptionTextArea';
import FilterSearch from './FormFields/FilterSearch';
import NameInput from './FormFields/NameInput';
import ProcessorTags from './FormFields/ProcessorTags';

export const renderPipelineForm = (
	setTagsListData: (tags: Array<string>) => void,
	tagsListData?: PipelineColumn['tags'],
): Array<JSX.Element> =>
	pipelineFields.map((item) => {
		if (item.id === '1') {
			return <FilterSearch key={item.id} fieldData={item} />;
		}
		if (item.id === '2') {
			return <NameInput key={item.id} fieldData={item} />;
		}
		if (item.id === '3') {
			return (
				<ProcessorTags
					key={item.id}
					fieldData={item}
					setTagsListData={setTagsListData}
					tagsListData={tagsListData as []}
				/>
			);
		}
		return <DescriptionTextArea key={item.id} fieldData={item} />;
	});
