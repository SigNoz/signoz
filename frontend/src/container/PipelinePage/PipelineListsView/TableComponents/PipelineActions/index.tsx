import { PipelineData } from 'types/api/pipeline/def';

import { IconListStyle } from '../../styles';
import DeleteAction from '../TableActions/DeleteAction';
import EditAction from '../TableActions/EditAction';
import PreviewAction from './components/PreviewAction';

function PipelineActions({
	pipeline,
	editAction,
	deleteAction,
}: PipelineActionsProps): JSX.Element {
	return (
		<IconListStyle>
			<PreviewAction pipeline={pipeline} />
			<EditAction editAction={editAction} isPipelineAction />
			<DeleteAction deleteAction={deleteAction} isPipelineAction />
		</IconListStyle>
	);
}

export interface PipelineActionsProps {
	pipeline: PipelineData;
	editAction: VoidFunction;
	deleteAction: VoidFunction;
}
export default PipelineActions;
