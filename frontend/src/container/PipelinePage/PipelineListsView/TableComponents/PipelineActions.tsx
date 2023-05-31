import { IconListStyle } from '../styles';
import DeleteAction from './TableActions/DeleteAction';
import EditAction from './TableActions/EditAction';
// import ViewAction from './TableActions/ViewAction';

function PipelineActions({
	isPipelineAction,
	editAction,
	deleteAction,
}: PipelineActionsProps): JSX.Element {
	return (
		<IconListStyle>
			<EditAction editAction={editAction} isPipelineAction={isPipelineAction} />
			{/* <ViewAction isPipelineAction={isPipelineAction} /> */}
			<DeleteAction
				deleteAction={deleteAction}
				isPipelineAction={isPipelineAction}
			/>
		</IconListStyle>
	);
}

export interface PipelineActionsProps {
	isPipelineAction: boolean;
	editAction: VoidFunction;
	deleteAction: VoidFunction;
}
export default PipelineActions;
