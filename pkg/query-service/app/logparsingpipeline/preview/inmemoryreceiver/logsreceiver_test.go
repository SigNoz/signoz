package inmemoryreceiver

import "testing"

func TestReceiverLifecycle(t *testing.T) {
	// There should be no exporter with an id before it is started.

	// Should be able to get a hold of the exporter after starting it.

	// Should not be able to start 2 exporters with the same id
	t.Fatal("TODO(Raj): Implement in memory exporter tests")

	// Should not be able to get a hold of an exporter after shutdown

	// Should be able to start a new exporter with same id after shuttin

}
