import CodeMirrorWhereClause from './CodeMirrorWhereClause/CodeMirrorWhereClause';
// import QueryWhereClause from './WhereClause/WhereClause';

function QueryBuilderV2(): JSX.Element {
	return (
		<div className="query-builder-v2">
			{/* <QueryWhereClause /> */}
			<CodeMirrorWhereClause />
		</div>
	);
}

export default QueryBuilderV2;
