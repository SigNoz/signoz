# 📋 ArchDrift Full Details

**Generated at (UTC):** 2026-02-18T15:39:28.217Z

## Detected Architectural Risk Signals

The following findings list architectural risk signals detected
in production code during this scan.

Each signal is anchored to a specific file and line number.
These signals contribute to the overall architectural drift snapshot
shown in the workspace summary.

---

---

## 📦 God Class

### [`frontend/src/api/generated/services/sigNoz.schemas.ts`](../../frontend/src/api/generated/services/sigNoz.schemas.ts)

- **[File-level](../../frontend/src/api/generated/services/sigNoz.schemas.ts):** Large Class detected (870 code lines). Consider splitting into smaller modules.

    ~~~ts
    /**
     * ! Do not edit manually
     * * The file has been auto-generated using Orval for SigNoz
    ~~~


### [`frontend/src/api/generated/services/users/index.ts`](../../frontend/src/api/generated/services/users/index.ts)

- **[File-level](../../frontend/src/api/generated/services/users/index.ts):** Large Class detected (1305 code lines). Consider splitting into smaller modules.

    ~~~ts
    /**
     * ! Do not edit manually
     * * The file has been auto-generated using Orval for SigNoz
    ~~~


### [`frontend/src/components/CeleryTask/CeleryTaskGraph/CeleryTaskGraphUtils.ts`](../../frontend/src/components/CeleryTask/CeleryTaskGraph/CeleryTaskGraphUtils.ts)

- **[File-level](../../frontend/src/components/CeleryTask/CeleryTaskGraph/CeleryTaskGraphUtils.ts):** Large Class detected (1021 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    import { PANEL_TYPES } from 'constants/queryBuilder';
    import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory'
    ~~~


### [`frontend/src/components/NewSelect/CustomMultiSelect.tsx`](../../frontend/src/components/NewSelect/CustomMultiSelect.tsx)

- **[File-level](../../frontend/src/components/NewSelect/CustomMultiSelect.tsx):** Monolith detected (1607 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    /* eslint-disable jsx-a11y/click-events-have-key-events */
    /* eslint-disable sonarjs/cognitive-complexity */
    ~~~


### [`frontend/src/components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch.tsx`](../../frontend/src/components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch.tsx)

- **[File-level](../../frontend/src/components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch.tsx):** Large Class detected (1252 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/no-identical-functions */
    /* eslint-disable sonarjs/cognitive-complexity */
    import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
    ~~~


### [`frontend/src/components/YAxisUnitSelector/constants.ts`](../../frontend/src/components/YAxisUnitSelector/constants.ts)

- **[File-level](../../frontend/src/components/YAxisUnitSelector/constants.ts):** Large Class detected (1020 code lines). Consider splitting into smaller modules.

    ~~~ts
    import { UnitFamilyConfig, UniversalYAxisUnit, YAxisUnit } from './types';
    
    // Mapping of universal y-axis units to their AWS, UCUM, and OpenMetrics equivalents (if available)
    ~~~


### [`frontend/src/components/YAxisUnitSelector/data.ts`](../../frontend/src/components/YAxisUnitSelector/data.ts)

- **[File-level](../../frontend/src/components/YAxisUnitSelector/data.ts):** Large Class detected (1266 code lines). Consider splitting into smaller modules.

    ~~~ts
    import { Y_AXIS_UNIT_NAMES } from './constants';
    import { UniversalYAxisUnit, YAxisCategory } from './types';
    
    ~~~


### [`frontend/src/container/ApiMonitoring/utils.tsx`](../../frontend/src/container/ApiMonitoring/utils.tsx)

- **[File-level](../../frontend/src/container/ApiMonitoring/utils.tsx):** Monolith detected (3167 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    import { ReactNode } from 'react';
    import { Color } from '@signozhq/design-tokens';
    ~~~


### [`frontend/src/container/ExplorerOptions/ExplorerOptions.tsx`](../../frontend/src/container/ExplorerOptions/ExplorerOptions.tsx)

- **[File-level](../../frontend/src/container/ExplorerOptions/ExplorerOptions.tsx):** Large Class detected (949 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable react/jsx-props-no-spreading */
    import {
    	CSSProperties,
    ~~~


### [`frontend/src/container/FormAlertRules/index.tsx`](../../frontend/src/container/FormAlertRules/index.tsx)

- **[File-level](../../frontend/src/container/FormAlertRules/index.tsx):** Large Class detected (839 code lines). Consider splitting into smaller modules.

    ~~~ts
    import { useCallback, useEffect, useMemo, useState } from 'react';
    import { useTranslation } from 'react-i18next';
    import { useQueryClient } from 'react-query';
    ~~~


### [`frontend/src/container/InfraMonitoringK8s/Clusters/ClusterDetails/constants.ts`](../../frontend/src/container/InfraMonitoringK8s/Clusters/ClusterDetails/constants.ts)

- **[File-level](../../frontend/src/container/InfraMonitoringK8s/Clusters/ClusterDetails/constants.ts):** Monolith detected (1591 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    import { K8sClustersData } from 'api/infraMonitoring/getK8sClustersList';
    import { PANEL_TYPES } from 'constants/queryBuilder';
    ~~~


### [`frontend/src/container/InfraMonitoringK8s/Namespaces/NamespaceDetails/constants.ts`](../../frontend/src/container/InfraMonitoringK8s/Namespaces/NamespaceDetails/constants.ts)

- **[File-level](../../frontend/src/container/InfraMonitoringK8s/Namespaces/NamespaceDetails/constants.ts):** Monolith detected (1596 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    import { K8sNamespacesData } from 'api/infraMonitoring/getK8sNamespacesList';
    import { PANEL_TYPES } from 'constants/queryBuilder';
    ~~~


### [`frontend/src/container/InfraMonitoringK8s/Nodes/NodeDetails/constants.ts`](../../frontend/src/container/InfraMonitoringK8s/Nodes/NodeDetails/constants.ts)

- **[File-level](../../frontend/src/container/InfraMonitoringK8s/Nodes/NodeDetails/constants.ts):** Monolith detected (1588 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    import { K8sNodesData } from 'api/infraMonitoring/getK8sNodesList';
    import { PANEL_TYPES } from 'constants/queryBuilder';
    ~~~


### [`frontend/src/container/InfraMonitoringK8s/Pods/PodDetails/constants.ts`](../../frontend/src/container/InfraMonitoringK8s/Pods/PodDetails/constants.ts)

- **[File-level](../../frontend/src/container/InfraMonitoringK8s/Pods/PodDetails/constants.ts):** Monolith detected (2525 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    import { K8sPodsData } from 'api/infraMonitoring/getK8sPodsList';
    import { PANEL_TYPES } from 'constants/queryBuilder';
    ~~~


### [`frontend/src/container/InfraMonitoringK8s/StatefulSets/StatefulSetDetails/constants.ts`](../../frontend/src/container/InfraMonitoringK8s/StatefulSets/StatefulSetDetails/constants.ts)

- **[File-level](../../frontend/src/container/InfraMonitoringK8s/StatefulSets/StatefulSetDetails/constants.ts):** Large Class detected (831 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    import { K8sStatefulSetsData } from 'api/infraMonitoring/getsK8sStatefulSetsList';
    import { PANEL_TYPES } from 'constants/queryBuilder';
    ~~~


### [`frontend/src/container/IngestionSettings/MultiIngestionSettings.tsx`](../../frontend/src/container/IngestionSettings/MultiIngestionSettings.tsx)

- **[File-level](../../frontend/src/container/IngestionSettings/MultiIngestionSettings.tsx):** Monolith detected (1724 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    /* eslint-disable jsx-a11y/click-events-have-key-events */
    import { ChangeEvent, useCallback, useEffect, useState } from 'react';
    ~~~


### [`frontend/src/container/ListOfDashboard/DashboardsList.tsx`](../../frontend/src/container/ListOfDashboard/DashboardsList.tsx)

- **[File-level](../../frontend/src/container/ListOfDashboard/DashboardsList.tsx):** Large Class detected (1038 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable no-nested-ternary */
    /* eslint-disable jsx-a11y/img-redundant-alt */
    /* eslint-disable jsx-a11y/click-events-have-key-events */
    ~~~


### [`frontend/src/container/LogDetailedView/InfraMetrics/constants.ts`](../../frontend/src/container/LogDetailedView/InfraMetrics/constants.ts)

- **[File-level](../../frontend/src/container/LogDetailedView/InfraMetrics/constants.ts):** Monolith detected (2525 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    import { PANEL_TYPES } from 'constants/queryBuilder';
    import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
    ~~~


### [`frontend/src/container/NewWidget/index.tsx`](../../frontend/src/container/NewWidget/index.tsx)

- **[File-level](../../frontend/src/container/NewWidget/index.tsx):** Large Class detected (818 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/cognitive-complexity */
    import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
    import { useTranslation } from 'react-i18next';
    ~~~


### [`frontend/src/container/OnboardingContainer/constants/apmDocFilePaths.ts`](../../frontend/src/container/OnboardingContainer/constants/apmDocFilePaths.ts)

- **[File-level](../../frontend/src/container/OnboardingContainer/constants/apmDocFilePaths.ts):** Large Class detected (1458 code lines). Consider splitting into smaller modules.

    ~~~ts
    /// ///////// APM
    
    /// // Java Start
    ~~~


### [`frontend/src/container/OnboardingV2Container/AddDataSource/AddDataSource.tsx`](../../frontend/src/container/OnboardingV2Container/AddDataSource/AddDataSource.tsx)

- **[File-level](../../frontend/src/container/OnboardingV2Container/AddDataSource/AddDataSource.tsx):** Large Class detected (1015 code lines). Consider splitting into smaller modules.

    ~~~ts
    import React, { useCallback, useEffect, useRef, useState } from 'react';
    import { SearchOutlined } from '@ant-design/icons';
    import {
    ~~~


### [`frontend/src/container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2.tsx`](../../frontend/src/container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2.tsx)

- **[File-level](../../frontend/src/container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2.tsx):** Large Class detected (966 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/cognitive-complexity */
    import {
    	KeyboardEvent,
    ~~~


### [`frontend/src/container/SideNav/SideNav.tsx`](../../frontend/src/container/SideNav/SideNav.tsx)

- **[File-level](../../frontend/src/container/SideNav/SideNav.tsx):** Large Class detected (1114 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable react/jsx-props-no-spreading */
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    /* eslint-disable jsx-a11y/click-events-have-key-events */
    ~~~


### [`frontend/src/container/SpanDetailsDrawer/SpanDetailsDrawer.tsx`](../../frontend/src/container/SpanDetailsDrawer/SpanDetailsDrawer.tsx)

- **[File-level](../../frontend/src/container/SpanDetailsDrawer/SpanDetailsDrawer.tsx):** Large Class detected (925 code lines). Consider splitting into smaller modules.

    ~~~ts
    import {
    	Dispatch,
    	SetStateAction,
    ~~~


### [`frontend/src/mocks-server/__mockdata__/tracedetail.ts`](../../frontend/src/mocks-server/__mockdata__/tracedetail.ts)

- **[File-level](../../frontend/src/mocks-server/__mockdata__/tracedetail.ts):** Monolith detected (2088 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    export const traceDetailResponse = [
    	{
    ~~~


### [`frontend/src/pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil.ts`](../../frontend/src/pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil.ts)

- **[File-level](../../frontend/src/pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil.ts):** Large Class detected (1112 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    import { PANEL_TYPES } from 'constants/queryBuilder';
    import { GetWidgetQueryBuilderProps } from 'container/MetricsApplication/types';
    ~~~


### [`frontend/src/parser/FilterQueryParser.ts`](../../frontend/src/parser/FilterQueryParser.ts)

- **[File-level](../../frontend/src/parser/FilterQueryParser.ts):** Monolith detected (1792 code lines). Consider splitting into smaller modules to reduce complexity pressure.

    ~~~ts
    // Generated from FilterQuery.g4 by ANTLR 4.13.1
    // noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols
    
    ~~~


### [`frontend/src/providers/QueryBuilder.tsx`](../../frontend/src/providers/QueryBuilder.tsx)

- **[File-level](../../frontend/src/providers/QueryBuilder.tsx):** Large Class detected (1074 code lines). Consider splitting into smaller modules.

    ~~~ts
    import {
    	createContext,
    	PropsWithChildren,
    ~~~


### [`frontend/src/utils/queryContextUtils.ts`](../../frontend/src/utils/queryContextUtils.ts)

- **[File-level](../../frontend/src/utils/queryContextUtils.ts):** Large Class detected (1202 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable */
    
    import { CharStreams, CommonTokenStream, Token } from 'antlr4';
    ~~~


---

## ⚡ N+1 Query

### [`frontend/src/container/PipelinePage/PipelineListsView/PipelineListsView.tsx`](../../frontend/src/container/PipelinePage/PipelineListsView/PipelineListsView.tsx)

- **[Line 471](../../frontend/src/container/PipelinePage/PipelineListsView/PipelineListsView.tsx#L471):** Database/API call inside loop. Consider batching queries or moving the call outside the loop.

    ~~~ts
    				count: pipelinesInDB.length,
    				enabled: pipelinesInDB.filter((p) => p.enabled).length,
    				source: 'signoz-ui',
    ~~~


---

## 🚫 Layer Violation

### [`frontend/src/api/generated/services/authdomains/index.ts`](../../frontend/src/api/generated/services/authdomains/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/authdomains/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/dashboard/index.ts`](../../frontend/src/api/generated/services/dashboard/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/dashboard/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/features/index.ts`](../../frontend/src/api/generated/services/features/index.ts)

- **[Line 17](../../frontend/src/api/generated/services/features/index.ts#L17):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type { GetFeatures200, RenderErrorResponseDTO } from '../sigNoz.schemas';
    ~~~


### [`frontend/src/api/generated/services/fields/index.ts`](../../frontend/src/api/generated/services/fields/index.ts)

- **[Line 17](../../frontend/src/api/generated/services/fields/index.ts#L17):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/gateway/index.ts`](../../frontend/src/api/generated/services/gateway/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/gateway/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/global/index.ts`](../../frontend/src/api/generated/services/global/index.ts)

- **[Line 17](../../frontend/src/api/generated/services/global/index.ts#L17):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/logs/index.ts`](../../frontend/src/api/generated/services/logs/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/logs/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/metrics/index.ts`](../../frontend/src/api/generated/services/metrics/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/metrics/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/orgs/index.ts`](../../frontend/src/api/generated/services/orgs/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/orgs/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/preferences/index.ts`](../../frontend/src/api/generated/services/preferences/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/preferences/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/role/index.ts`](../../frontend/src/api/generated/services/role/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/role/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/sessions/index.ts`](../../frontend/src/api/generated/services/sessions/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/sessions/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/generated/services/users/index.ts`](../../frontend/src/api/generated/services/users/index.ts)

- **[Line 20](../../frontend/src/api/generated/services/users/index.ts#L20):** service module importing from api ("import { GeneratedAPIInstance } from '../../../index';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { GeneratedAPIInstance } from '../../../index';
    import type {
    ~~~


### [`frontend/src/api/v1/settings/apdex/services/get.ts`](../../frontend/src/api/v1/settings/apdex/services/get.ts)

- **[Line 2](../../frontend/src/api/v1/settings/apdex/services/get.ts#L2):** service module importing from api ("import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import axios from 'api';
    import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
    import { AxiosError } from 'axios';
    ~~~


### [`frontend/src/container/Home/Services/constants.ts`](../../frontend/src/container/Home/Services/constants.ts)

- **[Line 2](../../frontend/src/container/Home/Services/constants.ts#L2):** service module importing from api ("import { ServicesList } from 'types/api/metrics/getService';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { TableProps } from 'antd';
    import { ServicesList } from 'types/api/metrics/getService';
    
    ~~~


### [`frontend/src/container/Home/Services/ServiceMetrics.tsx`](../../frontend/src/container/Home/Services/ServiceMetrics.tsx)

- **[Line 6](../../frontend/src/container/Home/Services/ServiceMetrics.tsx#L6):** service module importing from api ("import logEvent from 'api/common/logEvent';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { Button, Select, Skeleton, Table } from 'antd';
    import logEvent from 'api/common/logEvent';
    import { ENTITY_VERSION_V4 } from 'constants/app';
    ~~~

- **[Line 28](../../frontend/src/container/Home/Services/ServiceMetrics.tsx#L28):** service module importing from api ("import { ServicesList } from 'types/api/metrics/getService';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    } from 'types/api/licensesV3/getActive';
    import { ServicesList } from 'types/api/metrics/getService';
    import { GlobalReducer } from 'types/reducer/globalTime';
    ~~~


### [`frontend/src/container/Home/Services/ServiceTraces.tsx`](../../frontend/src/container/Home/Services/ServiceTraces.tsx)

- **[Line 5](../../frontend/src/container/Home/Services/ServiceTraces.tsx#L5):** service module importing from api ("import logEvent from 'api/common/logEvent';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { Button, Select, Skeleton, Table } from 'antd';
    import logEvent from 'api/common/logEvent';
    import ROUTES from 'constants/routes';
    ~~~

- **[Line 14](../../frontend/src/container/Home/Services/ServiceTraces.tsx#L14):** service module importing from api ("import { LicensePlatform } from 'types/api/licensesV3/getActive';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { AppState } from 'store/reducers';
    import { LicensePlatform } from 'types/api/licensesV3/getActive';
    import { ServicesList } from 'types/api/metrics/getService';
    ~~~

- **[Line 15](../../frontend/src/container/Home/Services/ServiceTraces.tsx#L15):** service module importing from api ("import { ServicesList } from 'types/api/metrics/getService';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { LicensePlatform } from 'types/api/licensesV3/getActive';
    import { ServicesList } from 'types/api/metrics/getService';
    import { GlobalReducer } from 'types/reducer/globalTime';
    ~~~


### [`frontend/src/lib/__fixtures__/getRandomColor.ts`](../../frontend/src/lib/__fixtures__/getRandomColor.ts)

- **[Line 3](../../frontend/src/lib/__fixtures__/getRandomColor.ts#L3):** lib module importing from api ("import { Span } from 'types/api/trace/getTraceItem';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { SIGNOZ_UI_COLOR_HEX } from 'lib/getRandomColor';
    import { Span } from 'types/api/trace/getTraceItem';
    
    ~~~


### [`frontend/src/lib/dashboard/getQueryResults.ts`](../../frontend/src/lib/dashboard/getQueryResults.ts)

- **[Line 5](../../frontend/src/lib/dashboard/getQueryResults.ts#L5):** lib module importing from api ("import { getMetricsQueryRange } from 'api/metrics/getQueryRange';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    
    import { getMetricsQueryRange } from 'api/metrics/getQueryRange';
    import {
    ~~~

- **[Line 26](../../frontend/src/lib/dashboard/getQueryResults.ts#L26):** lib module importing from api ("import { ExecStats, MetricRangePayloadV5 } from 'types/api/v5/queryRange';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    } from 'types/api/metrics/getQueryRange';
    import { ExecStats, MetricRangePayloadV5 } from 'types/api/v5/queryRange';
    import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
    ~~~

- **[Line 27](../../frontend/src/lib/dashboard/getQueryResults.ts#L27):** lib module importing from api ("import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { ExecStats, MetricRangePayloadV5 } from 'types/api/v5/queryRange';
    import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
    import { DataSource } from 'types/common/qu
    ~~~

- **[Line 31](../../frontend/src/lib/dashboard/getQueryResults.ts#L31):** lib module importing from api ("import { QueryData } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { prepareQueryRangePayload } from './prepareQueryRangePayload';
    import { QueryData } from 'types/api/widgets/getQuery';
    import { createAggregation } from 'api/v5/queryRange/prepareQueryRangeP
    ~~~

- **[Line 32](../../frontend/src/lib/dashboard/getQueryResults.ts#L32):** lib module importing from api ("import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { QueryData } from 'types/api/widgets/getQuery';
    import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
    import { IDashboardVariable } from 'types/api/dashboard/getA
    ~~~

- **[Line 33](../../frontend/src/lib/dashboard/getQueryResults.ts#L33):** lib module importing from api ("import { IDashboardVariable } from 'types/api/dashboard/getAll';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
    import { IDashboardVariable } from 'types/api/dashboard/getAll';
    import { EQueryType } from 'types/common/dashboard'
    ~~~

- **[Line 35](../../frontend/src/lib/dashboard/getQueryResults.ts#L35):** lib module importing from api ("import getPublicDashboardWidgetData from 'api/dashboard/public/getPublicDashboardWidgetData';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { EQueryType } from 'types/common/dashboard';
    import getPublicDashboardWidgetData from 'api/dashboard/public/getPublicDashboardWidgetData';
    
    ~~~


### [`frontend/src/lib/dashboard/prepareQueryRangePayload.ts`](../../frontend/src/lib/dashboard/prepareQueryRangePayload.ts)

- **[Line 5](../../frontend/src/lib/dashboard/prepareQueryRangePayload.ts#L5):** lib module importing from api ("import { QueryRangePayload } from 'types/api/metrics/getQueryRange';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import store from 'store';
    import { QueryRangePayload } from 'types/api/metrics/getQueryRange';
    import { EQueryType } from 'types/common/dashboard';
    ~~~


### [`frontend/src/lib/dashboardVariables/sortVariableValues.ts`](../../frontend/src/lib/dashboardVariables/sortVariableValues.ts)

- **[Line 2](../../frontend/src/lib/dashboardVariables/sortVariableValues.ts#L2):** lib module importing from api ("import { TSortVariableValuesType } from 'types/api/dashboard/getAll';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { sortBy } from 'lodash-es';
    import { TSortVariableValuesType } from 'types/api/dashboard/getAll';
    
    ~~~


### [`frontend/src/lib/getChartData.ts`](../../frontend/src/lib/getChartData.ts)

- **[Line 3](../../frontend/src/lib/getChartData.ts#L3):** lib module importing from api ("import { QueryData } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import getLabelName from 'lib/getLabelName';
    import { QueryData } from 'types/api/widgets/getQuery';
    
    ~~~


### [`frontend/src/lib/getLabelName.ts`](../../frontend/src/lib/getLabelName.ts)

- **[Line 1](../../frontend/src/lib/getLabelName.ts#L1):** lib module importing from api ("import { SeriesItem } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { SeriesItem } from 'types/api/widgets/getQuery';
    
    ~~~


### [`frontend/src/lib/getMaxMinTime.ts`](../../frontend/src/lib/getMaxMinTime.ts)

- **[Line 3](../../frontend/src/lib/getMaxMinTime.ts#L3):** lib module importing from api ("import { Widgets } from 'types/api/dashboard/getAll';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { GlobalTime } from 'types/actions/globalTime';
    import { Widgets } from 'types/api/dashboard/getAll';
    
    ~~~


### [`frontend/src/lib/getRandomColor.ts`](../../frontend/src/lib/getRandomColor.ts)

- **[Line 2](../../frontend/src/lib/getRandomColor.ts#L2):** lib module importing from api ("import { Span } from 'types/api/trace/getTraceItem';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    /* eslint-disable no-bitwise */
    import { Span } from 'types/api/trace/getTraceItem';
    
    ~~~


### [`frontend/src/lib/logs/flatLogData.ts`](../../frontend/src/lib/logs/flatLogData.ts)

- **[Line 2](../../frontend/src/lib/logs/flatLogData.ts#L2):** lib module importing from api ("import { ILog } from 'types/api/logs/log';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { defaultTo } from 'lodash-es';
    import { ILog } from 'types/api/logs/log';
    
    ~~~


### [`frontend/src/lib/newQueryBuilder/convertNewDataToOld.ts`](../../frontend/src/lib/newQueryBuilder/convertNewDataToOld.ts)

- **[Line 6](../../frontend/src/lib/newQueryBuilder/convertNewDataToOld.ts#L6):** lib module importing from api ("import { QueryData } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    } from 'types/api/metrics/getQueryRange';
    import { QueryData } from 'types/api/widgets/getQuery';
    
    ~~~


### [`frontend/src/lib/newQueryBuilder/getPaginationQueryData.ts`](../../frontend/src/lib/newQueryBuilder/getPaginationQueryData.ts)

- **[Line 3](../../frontend/src/lib/newQueryBuilder/getPaginationQueryData.ts#L3):** lib module importing from api ("import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
    import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
    import {
    ~~~


### [`frontend/src/lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery.ts`](../../frontend/src/lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery.ts)

- **[Line 2](../../frontend/src/lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery.ts#L2):** lib module importing from api ("import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { PANEL_TYPES } from 'constants/queryBuilder';
    import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
    import {
    ~~~


### [`frontend/src/lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi.ts`](../../frontend/src/lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi.ts)

- **[Line 3](../../frontend/src/lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi.ts#L3):** lib module importing from api ("import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { initialQueryState } from 'constants/queryBuilder';
    import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
    import {
    ~~~


### [`frontend/src/lib/query/createTableColumnsFromQuery.ts`](../../frontend/src/lib/query/createTableColumnsFromQuery.ts)

- **[Line 21](../../frontend/src/lib/query/createTableColumnsFromQuery.ts#L21):** lib module importing from api ("import { ListItem, QueryDataV3, SeriesItem } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    } from 'types/api/queryBuilder/queryBuilderData';
    import { ListItem, QueryDataV3, SeriesItem } from 'types/api/widgets/getQuery';
    import { EQueryType } from 'types/common/dashboard';
    ~~~


### [`frontend/src/lib/query/findDataTypeOfOperator.ts`](../../frontend/src/lib/query/findDataTypeOfOperator.ts)

- **[Line 2](../../frontend/src/lib/query/findDataTypeOfOperator.ts#L2):** lib module importing from api ("import { LocalDataType } from 'types/api/queryBuilder/queryAutocompleteResponse';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { operatorsByTypes } from 'constants/queryBuilder';
    import { LocalDataType } from 'types/api/queryBuilder/queryAutocompleteResponse';
    
    ~~~


### [`frontend/src/lib/query/transformQueryBuilderData.ts`](../../frontend/src/lib/query/transformQueryBuilderData.ts)

- **[Line 2](../../frontend/src/lib/query/transformQueryBuilderData.ts#L2):** lib module importing from api ("import { Having } from 'types/api/queryBuilder/queryBuilderData';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { OPERATORS } from 'constants/queryBuilder';
    import { Having } from 'types/api/queryBuilder/queryBuilderData';
    
    ~~~


### [`frontend/src/lib/uPlotLib/getUplotChartOptions.ts`](../../frontend/src/lib/uPlotLib/getUplotChartOptions.ts)

- **[Line 20](../../frontend/src/lib/uPlotLib/getUplotChartOptions.ts#L20):** lib module importing from api ("import { LegendPosition } from 'types/api/dashboard/getAll';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import _noop from 'lodash-es/noop';
    import { LegendPosition } from 'types/api/dashboard/getAll';
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    ~~~

- **[Line 21](../../frontend/src/lib/uPlotLib/getUplotChartOptions.ts#L21):** lib module importing from api ("import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { LegendPosition } from 'types/api/dashboard/getAll';
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    import { Query } from 'types/api/queryBuilder/queryBuilderData
    ~~~

- **[Line 22](../../frontend/src/lib/uPlotLib/getUplotChartOptions.ts#L22):** lib module importing from api ("import { Query } from 'types/api/queryBuilder/queryBuilderData';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    import { Query } from 'types/api/queryBuilder/queryBuilderData';
    import { QueryData, QueryDataV3 } from 'types/api/widgets/
    ~~~

- **[Line 23](../../frontend/src/lib/uPlotLib/getUplotChartOptions.ts#L23):** lib module importing from api ("import { QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { Query } from 'types/api/queryBuilder/queryBuilderData';
    import { QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';
    import uPlot from 'uplot';
    ~~~


### [`frontend/src/lib/uPlotLib/getUplotHistogramChartOptions.ts`](../../frontend/src/lib/uPlotLib/getUplotHistogramChartOptions.ts)

- **[Line 9](../../frontend/src/lib/uPlotLib/getUplotHistogramChartOptions.ts#L9):** lib module importing from api ("import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import _noop from 'lodash-es/noop';
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    import { Query } from 'types/api/queryBuilder/queryBuilderData';
    ~~~

- **[Line 10](../../frontend/src/lib/uPlotLib/getUplotHistogramChartOptions.ts#L10):** lib module importing from api ("import { Query } from 'types/api/queryBuilder/queryBuilderData';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    import { Query } from 'types/api/queryBuilder/queryBuilderData';
    import { QueryData } from 'types/api/widgets/getQuery';
    ~~~

- **[Line 11](../../frontend/src/lib/uPlotLib/getUplotHistogramChartOptions.ts#L11):** lib module importing from api ("import { QueryData } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { Query } from 'types/api/queryBuilder/queryBuilderData';
    import { QueryData } from 'types/api/widgets/getQuery';
    import uPlot from 'uplot';
    ~~~


### [`frontend/src/lib/uPlotLib/plugins/onClickPlugin.ts`](../../frontend/src/lib/uPlotLib/plugins/onClickPlugin.ts)

- **[Line 4](../../frontend/src/lib/uPlotLib/plugins/onClickPlugin.ts#L4):** lib module importing from api ("import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { generateColor } from 'lib/uPlotLib/utils/generateColor';
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    
    ~~~


### [`frontend/src/lib/uPlotLib/plugins/tooltipPlugin.ts`](../../frontend/src/lib/uPlotLib/plugins/tooltipPlugin.ts)

- **[Line 10](../../frontend/src/lib/uPlotLib/plugins/tooltipPlugin.ts#L10):** lib module importing from api ("import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { get } from 'lodash-es';
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    import { Query } from 'types/api/queryBuilder/queryBuilderData';
    ~~~

- **[Line 11](../../frontend/src/lib/uPlotLib/plugins/tooltipPlugin.ts#L11):** lib module importing from api ("import { Query } from 'types/api/queryBuilder/queryBuilderData';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    import { Query } from 'types/api/queryBuilder/queryBuilderData';
    
    ~~~


### [`frontend/src/lib/uPlotLib/utils/getSeriesData.ts`](../../frontend/src/lib/uPlotLib/utils/getSeriesData.ts)

- **[Line 7](../../frontend/src/lib/uPlotLib/utils/getSeriesData.ts#L7):** lib module importing from api ("import { Query } from 'types/api/queryBuilder/queryBuilderData';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { isUndefined } from 'lodash-es';
    import { Query } from 'types/api/queryBuilder/queryBuilderData';
    import { QueryData } from 'types/api/widgets/getQuery';
    ~~~

- **[Line 8](../../frontend/src/lib/uPlotLib/utils/getSeriesData.ts#L8):** lib module importing from api ("import { QueryData } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { Query } from 'types/api/queryBuilder/queryBuilderData';
    import { QueryData } from 'types/api/widgets/getQuery';
    
    ~~~


### [`frontend/src/lib/uPlotLib/utils/getUplotChartData.ts`](../../frontend/src/lib/uPlotLib/utils/getUplotChartData.ts)

- **[Line 4](../../frontend/src/lib/uPlotLib/utils/getUplotChartData.ts#L4):** lib module importing from api ("import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { isUndefined } from 'lodash-es';
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    import { QueryData } from 'types/api/widgets/getQuery';
    ~~~

- **[Line 5](../../frontend/src/lib/uPlotLib/utils/getUplotChartData.ts#L5):** lib module importing from api ("import { QueryData } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
    import { QueryData } from 'types/api/widgets/getQuery';
    
    ~~~


### [`frontend/src/lib/uPlotLib/utils/getYAxisScale.ts`](../../frontend/src/lib/uPlotLib/utils/getYAxisScale.ts)

- **[Line 4](../../frontend/src/lib/uPlotLib/utils/getYAxisScale.ts#L4):** lib module importing from api ("import { QueryDataV3 } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { isFinite } from 'lodash-es';
    import { QueryDataV3 } from 'types/api/widgets/getQuery';
    import uPlot from 'uplot';
    ~~~


---

## 🧪 Test File Violations

The following signals were detected in test files.
Test file signals are excluded from the architectural drift snapshot.

---

### 📦 God Class

#### [`frontend/src/api/v5/queryRange/prepareQueryRangePayloadV5.test.ts`](../../frontend/src/api/v5/queryRange/prepareQueryRangePayloadV5.test.ts) *(test file)*

- **[File-level](../../frontend/src/api/v5/queryRange/prepareQueryRangePayloadV5.test.ts):** Large Class detected (828 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string, simple-import-sort/imports, @typescript-eslint/indent, no-mixed-spaces-and-tabs */
    import { PANEL_TYPES } from 'constants/queryBuilder';
    import {
    ~~~


#### [`frontend/src/components/NewSelect/__test__/CustomMultiSelect.comprehensive.test.tsx`](../../frontend/src/components/NewSelect/__test__/CustomMultiSelect.comprehensive.test.tsx) *(test file)*

- **[File-level](../../frontend/src/components/NewSelect/__test__/CustomMultiSelect.comprehensive.test.tsx):** Large Class detected (1083 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/no-identical-functions */
    /* eslint-disable sonarjs/no-duplicate-string */
    import { VirtuosoMockContext } from 'react-virtuoso';
    ~~~


#### [`frontend/src/components/QueryBuilderV2/__tests__/utils.test.ts`](../../frontend/src/components/QueryBuilderV2/__tests__/utils.test.ts) *(test file)*

- **[File-level](../../frontend/src/components/QueryBuilderV2/__tests__/utils.test.ts):** Large Class detected (1235 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    /* eslint-disable import/no-unresolved */
    import { negateOperator, OPERATORS } from 'constants/antlrQueryConstants';
    ~~~


#### [`frontend/src/components/YAxisUnitSelector/__tests__/formatter.test.tsx`](../../frontend/src/components/YAxisUnitSelector/__tests__/formatter.test.tsx) *(test file)*

- **[File-level](../../frontend/src/components/YAxisUnitSelector/__tests__/formatter.test.tsx):** Large Class detected (833 code lines). Consider splitting into smaller modules.

    ~~~ts
    import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
    
    import {
    ~~~


#### [`frontend/src/container/SpanDetailsDrawer/__tests__/SpanDetailsDrawer.test.tsx`](../../frontend/src/container/SpanDetailsDrawer/__tests__/SpanDetailsDrawer.test.tsx) *(test file)*

- **[File-level](../../frontend/src/container/SpanDetailsDrawer/__tests__/SpanDetailsDrawer.test.tsx):** Large Class detected (958 code lines). Consider splitting into smaller modules.

    ~~~ts
    /* eslint-disable sonarjs/no-duplicate-string */
    /* eslint-disable sonarjs/no-identical-functions */
    
    ~~~


---

### 🚫 Layer Violation

#### [`frontend/src/lib/dashboardVariables/variableReference.test.ts`](../../frontend/src/lib/dashboardVariables/variableReference.test.ts) *(test file)*

- **[Line 1](../../frontend/src/lib/dashboardVariables/variableReference.test.ts#L1):** lib module importing from api ("import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
    import { EQueryType } from 'types/common/dashboard';
    ~~~


#### [`frontend/src/lib/dashboardVariables/variableReference.ts`](../../frontend/src/lib/dashboardVariables/variableReference.ts) *(test file)*

- **[Line 2](../../frontend/src/lib/dashboardVariables/variableReference.ts#L2):** lib module importing from api ("import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { isArray } from 'lodash-es';
    import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
    import { EQueryType } from 'types/common/dashboard';
    ~~~


#### [`frontend/src/lib/getRandomColor.test.ts`](../../frontend/src/lib/getRandomColor.test.ts) *(test file)*

- **[Line 2](../../frontend/src/lib/getRandomColor.test.ts#L2):** lib module importing from api ("import { Span } from 'types/api/trace/getTraceItem';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { themeColors } from 'constants/theme';
    import { Span } from 'types/api/trace/getTraceItem';
    
    ~~~


#### [`frontend/src/lib/newQueryBuilder/queryBuilderMappers/__tests__/mapQueryDataFromApiInputs.ts`](../../frontend/src/lib/newQueryBuilder/queryBuilderMappers/__tests__/mapQueryDataFromApiInputs.ts) *(test file)*

- **[Line 3](../../frontend/src/lib/newQueryBuilder/queryBuilderMappers/__tests__/mapQueryDataFromApiInputs.ts#L3):** lib module importing from api ("import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { PANEL_TYPES } from 'constants/queryBuilder';
    import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
    import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResp
    ~~~

- **[Line 4](../../frontend/src/lib/newQueryBuilder/queryBuilderMappers/__tests__/mapQueryDataFromApiInputs.ts#L4):** lib module importing from api ("import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
    import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
    import { EQueryType } from 'types/common/dashbo
    ~~~


#### [`frontend/src/lib/uPlotLib/utils/getYAxisScale.test.ts`](../../frontend/src/lib/uPlotLib/utils/getYAxisScale.test.ts) *(test file)*

- **[Line 3](../../frontend/src/lib/uPlotLib/utils/getYAxisScale.test.ts#L3):** lib module importing from api ("import { QueryDataV3 } from 'types/api/widgets/getQuery';"). This creates architectural coupling between layers. Consider refactoring to respect layer boundaries.

    ~~~ts
    import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
    import { QueryDataV3 } from 'types/api/widgets/getQuery';
    
    ~~~


---

Generated by ArchDrift v1.0
