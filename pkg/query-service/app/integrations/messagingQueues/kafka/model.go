package kafka

const KafkaQueue = "kafka"

type MessagingQueue struct {
	Start     int64             `json:"start"`
	End       int64             `json:"end"`
	EvalTime  int64             `json:"eval_time,omitempty"`
	Variables map[string]string `json:"variables,omitempty"`
}

type Clients struct {
	Hash              map[string]struct{}
	ClientID          []string
	ServiceInstanceID []string
	ServiceName       []string
	TopicName         []string
}

type OnboardingResponse struct {
	Attribute string `json:"attribute"`
	Message   string `json:"error_message"`
	Status    string `json:"status"`
}

type WorkerResponse struct {
	Count int      `json:"active_workers"`
	Names []string `json:"worker_names"`
}

// QueueFilters
// ToDo: add capability of dynamic filtering based on any of the filters
type QueueFilters struct {
	ServiceName []string
	SpanName    []string
	Queue       []string
	Destination []string
	Kind        []string

	QueryFor []string
	Status   []string

	TaskName []string

	LatencyType []string
}

type CeleryTask struct {
	kind   string
	status string
	name   string
}

type CeleryTasks interface {
	GetKind() string
	GetStatus() string
	GetName() string
}

func (r *CeleryTask) GetKind() string {
	return r.kind
}

func (r *CeleryTask) GetStatus() string {
	return r.status
}

func (r *CeleryTask) GetName() string {
	return r.name
}
