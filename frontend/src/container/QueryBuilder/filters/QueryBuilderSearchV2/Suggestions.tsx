import './Suggestions.styles.scss';

import { Tag } from './QueryBuilderSearchV2';

interface ISuggestionsProps {
	searchValue: string;
	currentFilterItem?: Tag;
}

function Suggestions(props: ISuggestionsProps): React.ReactElement {
	const { searchValue, currentFilterItem } = props;
	return <div className="suggestions-dropdown">contextual suggestions</div>;
}

Suggestions.defaultProps = {
	currentFilterItem: undefined,
};

export default Suggestions;
