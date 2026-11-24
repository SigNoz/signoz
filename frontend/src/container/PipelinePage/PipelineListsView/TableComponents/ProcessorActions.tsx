import { IconListStyle } from '../styles';
import DeleteAction from './TableActions/DeleteAction';
import EditAction from './TableActions/EditAction';

function ProcessorActions({
	editAction,
	deleteAction,
}: ProcessorActionsProps): JSX.Element {
	return (
		<IconListStyle>
			<EditAction editAction={editAction} isPipelineAction={false} />
			<DeleteAction deleteAction={deleteAction} isPipelineAction={false} />
		</IconListStyle>
	);
}

interface ProcessorActionsProps {
	editAction: VoidFunction;
	deleteAction: VoidFunction;
}
export default ProcessorActions;
