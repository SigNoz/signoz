import { Button } from '@signozhq/ui/button';
import { DataSource } from 'types/common/queryBuilder';

import ExportMenu from '@/components/ExportMenu/ExportMenu';
import HeaderRightSection from '@/components/HeaderRightSection/HeaderRightSection';
import type { ClientExportData } from '@/hooks/useExportData/useClientExport';
import AuthZTooltip from '@/lib/authz/components/AuthZTooltip/AuthZTooltip';
import {
	APIKeyCreatePermission,
	RoleAttachWildcardPermission,
	RoleDetachWildcardPermission,
	SACreatePermission,
	SAListPermission,
} from '@/lib/authz/hooks/useAuthZ/permissions/service-account.permissions';
import Legend from '@/lib/uPlotV2/components/Legend/Legend';
import { LegendPosition } from '@/lib/uPlotV2/components/types';
import type { LegendItem } from '@/lib/uPlotV2/config/types';
import ExpandableValue from '@/periscope/components/ExpandableValue/ExpandableValue';

import styles from './TooltipsFixture.module.scss';

export type TooltipSite =
	| 'authz-denied'
	| 'chart-legend'
	| 'expandable-value'
	| 'export-menu'
	| 'noz';

interface TooltipsFixtureProps {
	site: TooltipSite;
}

const DENIED_CHECKS = [
	SACreatePermission,
	SAListPermission,
	APIKeyCreatePermission,
	RoleAttachWildcardPermission,
	RoleDetachWildcardPermission,
];

const LEGEND_ITEMS: LegendItem[] = [
	{
		seriesIndex: 1,
		label:
			'signoz_latency_bucket{service_name="checkout", operation="POST /api/v1/orders/{orderId}/payment-authorisation", deployment_environment="production", cluster="eu-central-1"}',
		color: '#F24769',
		show: true,
	},
];

const LONG_JSON_VALUE = JSON.stringify(
	{
		exception: 'io.signoz.checkout.PaymentAuthorisationTimeout',
		message:
			'Authorisation for order 8f21c4a0-6d1e-4c73-9b02-0f5a1d7e33aa timed out after 30000ms',
		stack: [
			'io.signoz.checkout.PaymentClient.authorise(PaymentClient.java:184)',
			'io.signoz.checkout.OrderService.placeOrder(OrderService.java:96)',
			'io.signoz.checkout.OrderController.post(OrderController.java:41)',
		],
		attributes: {
			'deployment.environment': 'production',
			'k8s.namespace.name': 'checkout',
			'net.peer.name': 'payments-authorisation.production.svc.cluster.local',
		},
	},
	null,
	2,
);

const EXPORT_DATA: ClientExportData = {
	statusCode: 200,
	message: 'success',
	error: null,
	payload: {
		data: {
			result: [],
			resultType: 'matrix',
			newResult: { data: { result: [], resultType: 'matrix' } },
		},
	},
};

const noOp = (): void => undefined;

function TooltipsFixture({ site }: TooltipsFixtureProps): JSX.Element {
	if (site === 'authz-denied') {
		return (
			<div className={styles.fixture}>
				<AuthZTooltip checks={DENIED_CHECKS}>
					<Button color="primary" variant="solid">
						Create service account
					</Button>
				</AuthZTooltip>
			</div>
		);
	}

	if (site === 'chart-legend') {
		return (
			<div className={styles.fixture}>
				<div className={styles.legend}>
					<Legend
						focusedSeriesIndex={null}
						items={LEGEND_ITEMS}
						position={LegendPosition.BOTTOM}
						onClick={noOp}
						onMouseLeave={noOp}
						onMouseMove={noOp}
					/>
				</div>
			</div>
		);
	}

	if (site === 'expandable-value') {
		return (
			<div className={styles.fixture}>
				<ExpandableValue title="Exception" value={LONG_JSON_VALUE}>
					<span className={styles.truncatedValue}>{LONG_JSON_VALUE}</span>
				</ExpandableValue>
			</div>
		);
	}

	if (site === 'export-menu') {
		return (
			<div className={styles.fixture}>
				<ExportMenu data={EXPORT_DATA} dataSource={DataSource.METRICS} />
			</div>
		);
	}

	return (
		<div className={styles.fixture}>
			<HeaderRightSection
				enableAnnouncements={false}
				enableFeedback={false}
				enableShare={false}
			/>
		</div>
	);
}

export default TooltipsFixture;
