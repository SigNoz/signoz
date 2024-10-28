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
