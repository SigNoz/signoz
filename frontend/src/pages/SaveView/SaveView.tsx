import { DataSource } from 'types/common/queryBuilder';

function SaveView({ sourcepage }: SaveViewProps): JSX.Element {
	return <>Helo {sourcepage} </>;
}

export type SaveViewProps = {
	sourcepage: DataSource;
};

export default SaveView;
