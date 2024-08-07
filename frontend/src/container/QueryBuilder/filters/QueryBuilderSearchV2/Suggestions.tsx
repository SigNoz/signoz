import './Suggestions.styles.scss';

import { Button } from 'antd';

import { DropdownState, Option, Tag } from './QueryBuilderSearchV2';

interface ISuggestionsProps {
	searchValue: string;
	options: Option[];
	onChange: (value: Option['value']) => void;
	currentState: DropdownState;
	currentFilterItem?: Tag;
}

function Suggestions(props: ISuggestionsProps): React.ReactElement {
	const {
		searchValue,
		currentFilterItem,
		options,
		onChange,
		currentState,
	} = props;
	// on the select from the dropdown the tokenisation should happen automatically

	return (
		<div className="suggestions-dropdown">
			{options.map((option) => (
				<Button
					// this is done to remove the keys with same names
					key={JSON.stringify(option.value)}
					onClick={(): void => {
						onChange(option.value);
					}}
				>
					{option.label}{' '}
				</Button>
			))}
		</div>
	);
}

Suggestions.defaultProps = {
	currentFilterItem: undefined,
};

export default Suggestions;
