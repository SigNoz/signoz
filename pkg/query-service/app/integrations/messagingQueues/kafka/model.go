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

// QueueFilters
// ToDo: add capability of dynamic filtering based on any of the filters
type QueueFilters struct {
	ServiceName []string
	SpanName    []string
	Queue       []string
	Destination []string
	Kind        []string
}

type CeleryTask struct {
	kind   string
	status string
}

type CeleryTasks interface {
	GetKind() string
	GetStatus() string
	Set(string, string)
}

func (r *CeleryTask) GetKind() string {
	return r.kind
}

func (r *CeleryTask) GetStatus() string {
	return r.status
}

func (r *CeleryTask) Set(kind, status string) {
	r.kind = kind
	r.status = status
}
