package kafka

const kafkaQueue = "kafka"

type MessagingQueue struct {
	Start     int64             `json:"start"`
	End       int64             `json:"end"`
	Variables map[string]string `json:"variables,omitempty"`
}

type Clients struct {
	ConsumerId  string
	ServiceName string
}
