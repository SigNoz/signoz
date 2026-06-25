import styles from './PanelBody.module.scss';

interface UnsupportedPanelBodyProps {
	/** Short, signoz-prefix-stripped panel kind (e.g. "TablePanel"). */
	kind: string;
	queryCount: number;
}

/**
 * Body shown when no renderer is registered for the panel's kind. Split out so
 * `PanelBody` only ever runs with a resolved renderer.
 */
function UnsupportedPanelBody({
	kind,
	queryCount,
}: UnsupportedPanelBodyProps): JSX.Element {
	return (
		<div className={styles.body} data-testid="panel-unknown-kind-fallback">
			<div>
				<div className={styles.bodyKind}>{kind} panel</div>
				<div>
					{queryCount} {queryCount === 1 ? 'query' : 'queries'} · not yet supported
					in V2
				</div>
			</div>
		</div>
	);
}

export default UnsupportedPanelBody;
