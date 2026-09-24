import { Color } from '@signozhq/design-tokens';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { Querybuildertypesv5QueryWarnDataDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './K8sPaginationWarning.module.scss';
import TriangleAlert from '@signozhq/icons/TriangleAlert';

export type K8sPaginationWarningProps = {
	warning: Querybuildertypesv5QueryWarnDataDTO;
};

export function K8sPaginationWarning({
	warning,
}: K8sPaginationWarningProps): JSX.Element {
	return (
		<span data-testid="k8s-list-warning-popover">
			<WarningPopover
				warningData={{
					code: 'WARNING',
					message: warning.message ?? '',
					url: warning.url ?? '',
					warnings:
						warning.warnings?.map((w) => ({ message: w.message ?? '' })) ?? [],
				}}
			>
				<div className={styles.paginationWarning}>
					Your data contains some warnings
					<TriangleAlert
						size={16}
						className={styles.warningIcon}
						color={Color.BG_AMBER_500}
					/>
				</div>
			</WarningPopover>
		</span>
	);
}
