import { Button } from 'antd';
import CategoryHeading from 'components/Logs/CategoryHeading';
import map from 'lodash-es/map';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
// import { ADD_SEARCH_FIELD_QUERY_STRING } from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';

import FieldKey from './FieldKey';

interface SuggestedItemProps {
	name: string;
	type: string;
	applySuggestion: (name: string) => void;
}
function SuggestedItem({
	name,
	type,
	applySuggestion,
}: SuggestedItemProps): JSX.Element {
	const addSuggestedField = (): void => {
		applySuggestion(name);
	};
	return (
		<Button
			type="text"
			style={{ display: 'block', padding: '0.2rem' }}
			onClick={addSuggestedField}
		>
			<FieldKey name={name} type={type} />
		</Button>
	);
}

interface SuggestionsProps {
	applySuggestion: (name: string) => void;
}

function Suggestions({ applySuggestion }: SuggestionsProps): JSX.Element {
	const {
		fields: { selected },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);

	return (
		<div>
			<CategoryHeading>SUGGESTIONS</CategoryHeading>
			<div>
				{map(selected, (field) => (
					<SuggestedItem
						key={JSON.stringify(field)}
						name={field.name}
						type={field.type}
						applySuggestion={applySuggestion}
					/>
				))}
			</div>
		</div>
	);
}

export default Suggestions;
