import { Button } from 'antd';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { SavePipelineData } from 'store/actions';
import { AppState } from 'store/reducers';
import { PipelineReducerType } from 'store/reducers/pipeline';

import { ActionMode } from '../Layouts';
import { PipelineColumn } from '.';
import { SaveConfigWrapper } from './styles';

function SaveConfigButton({
	setActionMode,
	setIsVisibleSaveButton,
	pipelineDataState,
	setPipelineDataState,
}: SaveConfigButtonTypes): JSX.Element {
	const { t } = useTranslation('pipeline');
	const dispatch = useDispatch();
	const { pipelineData } = useSelector<AppState, PipelineReducerType>(
		(state) => state.pipeline,
	);

	const onSaveHandler = useCallback((): void => {
		setActionMode(ActionMode.Viewing);
		setIsVisibleSaveButton(undefined);
		dispatch(SavePipelineData(pipelineDataState));
		setPipelineDataState(pipelineDataState);
	}, [
		dispatch,
		pipelineDataState,
		setActionMode,
		setIsVisibleSaveButton,
		setPipelineDataState,
	]);

	const onCancelHandler = useCallback((): void => {
		setActionMode(ActionMode.Viewing);
		setIsVisibleSaveButton(undefined);
		dispatch(SavePipelineData(pipelineData));
	}, [dispatch, pipelineData, setActionMode, setIsVisibleSaveButton]);

	return (
		<SaveConfigWrapper>
			<Button
				key="submit"
				type="primary"
				htmlType="submit"
				style={{ borderRadius: '0.375rem' }}
				onClick={onSaveHandler}
			>
				{t('save_configuration')}
			</Button>
			<Button
				key="cancel"
				style={{ borderRadius: '0.375rem' }}
				onClick={onCancelHandler}
			>
				{t('cancel')}
			</Button>
		</SaveConfigWrapper>
	);
}
export interface SaveConfigButtonTypes {
	setActionMode: (actionMode: ActionMode) => void;
	setIsVisibleSaveButton: (actionMode?: ActionMode) => void;
	pipelineDataState: Array<PipelineColumn>;
	setPipelineDataState: (
		value: React.SetStateAction<Array<PipelineColumn>>,
	) => void;
}

export default SaveConfigButton;
