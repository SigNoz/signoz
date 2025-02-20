package alertmanagerbatcher

type Config struct {
	// Capacity is the maximum number of alerts that can be buffered in the batcher.
	Capacity int

	// Size is the number of alerts to send in each batch.
	Size int
}

func NewConfig() Config {
	return Config{
		Capacity: 10000,
		Size:     64,
	}
}
