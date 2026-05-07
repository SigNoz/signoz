package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addInfraMonitoringRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/infra_monitoring/hosts", handler.New(
		provider.authZ.ViewAccess(provider.infraMonitoringHandler.ListHosts),
		handler.OpenAPIDef{
			ID:                  "ListHosts",
			Tags:                []string{"inframonitoring"},
			Summary:             "List Hosts for Infra Monitoring",
			Description:         "Returns a paginated list of hosts with key infrastructure metrics: CPU usage (%), memory usage (%), I/O wait (%), disk usage (%), and 15-minute load average. Each host includes its current status (active/inactive based on metrics reported in the last 10 minutes) and metadata attributes (e.g., os.type). Supports filtering via a filter expression, filtering by host status, custom groupBy to aggregate hosts by any attribute, ordering by any of the five metrics, and pagination via offset/limit. The response type is 'list' for the default host.name grouping or 'grouped_list' for custom groupBy keys. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (cpu, memory, wait, load15, diskUsage) return -1 as a sentinel when no data is available for that field.",
			Request:             new(inframonitoringtypes.PostableHosts),
			RequestContentType:  "application/json",
			Response:            new(inframonitoringtypes.Hosts),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/infra_monitoring/pods", handler.New(
		provider.authZ.ViewAccess(provider.infraMonitoringHandler.ListPods),
		handler.OpenAPIDef{
			ID:                  "ListPods",
			Tags:                []string{"inframonitoring"},
			Summary:             "List Pods for Infra Monitoring",
			Description:         "Returns a paginated list of Kubernetes pods with key metrics: CPU usage, CPU request/limit utilization, memory working set, memory request/limit utilization, current pod phase (pending/running/succeeded/failed/unknown/no_data), and pod age (ms since start time). Each pod includes metadata attributes (namespace, node, workload owner such as deployment/statefulset/daemonset/job/cronjob, cluster). Supports filtering via a filter expression, custom groupBy to aggregate pods by any attribute, ordering by any of the six metrics (cpu, cpu_request, cpu_limit, memory, memory_request, memory_limit), and pagination via offset/limit. The response type is 'list' for the default k8s.pod.uid grouping (each row is one pod with its current phase) or 'grouped_list' for custom groupBy keys (each row aggregates pods in the group with per-phase counts under podCountsByPhase: { pending, running, succeeded, failed, unknown } derived from each pod's latest phase in the window). Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (podCPU, podCPURequest, podCPULimit, podMemory, podMemoryRequest, podMemoryLimit, podAge) return -1 as a sentinel when no data is available for that field.",
			Request:             new(inframonitoringtypes.PostablePods),
			RequestContentType:  "application/json",
			Response:            new(inframonitoringtypes.Pods),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/infra_monitoring/nodes", handler.New(
		provider.authZ.ViewAccess(provider.infraMonitoringHandler.ListNodes),
		handler.OpenAPIDef{
			ID:                  "ListNodes",
			Tags:                []string{"inframonitoring"},
			Summary:             "List Nodes for Infra Monitoring",
			Description:         "Returns a paginated list of Kubernetes nodes with key metrics: CPU usage, CPU allocatable, memory working set, memory allocatable, per-group nodeCountsByReadiness ({ ready, notReady } from each node's latest k8s.node.condition_ready in the window) and per-group podCountsByPhase ({ pending, running, succeeded, failed, unknown } for pods scheduled on the listed nodes). Each node includes metadata attributes (k8s.node.uid, k8s.cluster.name). The response type is 'list' for the default k8s.node.name grouping (each row is one node with its current condition string: ready / not_ready / no_data) or 'grouped_list' for custom groupBy keys (each row aggregates nodes in the group; condition stays no_data). Supports filtering via a filter expression, custom groupBy, ordering by cpu / cpu_allocatable / memory / memory_allocatable, and pagination via offset/limit. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (nodeCPU, nodeCPUAllocatable, nodeMemory, nodeMemoryAllocatable) return -1 as a sentinel when no data is available for that field.",
			Request:             new(inframonitoringtypes.PostableNodes),
			RequestContentType:  "application/json",
			Response:            new(inframonitoringtypes.Nodes),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}
