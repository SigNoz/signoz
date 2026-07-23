package alerting

import (
	"context"
	"errors"
	"testing"
)

type recordingSink struct {
	calls int
	err   error
}

func (s *recordingSink) Notify(context.Context, Event) error {
	s.calls++
	return s.err
}

func TestMultiSinkAttemptsEverySinkAndJoinsErrors(t *testing.T) {
	firstErr := errors.New("first sink failed")
	lastErr := errors.New("last sink failed")
	first := &recordingSink{err: firstErr}
	middle := &recordingSink{}
	last := &recordingSink{err: lastErr}

	err := (MultiSink{first, middle, last}).Notify(context.Background(), Event{})

	if first.calls != 1 || middle.calls != 1 || last.calls != 1 {
		t.Fatalf("every sink must be attempted: first=%d middle=%d last=%d", first.calls, middle.calls, last.calls)
	}
	if !errors.Is(err, firstErr) || !errors.Is(err, lastErr) {
		t.Fatalf("joined error does not retain sink failures: %v", err)
	}
}
