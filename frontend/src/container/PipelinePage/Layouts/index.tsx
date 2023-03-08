import getPipeline from 'api/pipeline/get';
import Spinner from 'components/Spinner';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';

import PipelineListsView from '../PipelineListsView';
import CreatePipelineButton from './CreatePipelineButton';
import PipelinesSearchSection from './PipelinesSearchSection';

function PipelinePageLayout(): JSX.Element {
	const { t } = useTranslation('common');
	const [isActionType, setActionType] = useState<string>();
	const [isActionMode, setActionMode] = useState<string>('viewing-mode');
	const { isLoading, data: piplineData, isError } = useQuery(
		['version', 'latest'],
		{
			queryFn: () =>
				getPipeline({
					version: 'latest',
				}),
		},
	);

	if (isError) {
		return <div>{piplineData?.error || t('something_went_wrong')}</div>;
	}

	// in case of loading
	if (isLoading || !piplineData?.payload) {
		return <Spinner height="75vh" tip="Loading Pipelines..." />;
	}

	return (
		<>
			<CreatePipelineButton
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				piplineData={piplineData.payload}
			/>
			<PipelinesSearchSection />
			<PipelineListsView
				isActionType={String(isActionType)}
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				piplineData={piplineData.payload}
			/>
		</>
	);
}

export enum ActionType {
	AddPipeline = 'add-pipeline',
	EditPipeline = 'edit-pipeline',
	AddProcessor = 'add-processor',
	EditProcessor = 'edit-processor',
}

export enum ActionMode {
	Viewing = 'viewing-mode',
	Editing = 'editing-mode',
	Deploying = 'deploying-mode',
}
export default PipelinePageLayout;
