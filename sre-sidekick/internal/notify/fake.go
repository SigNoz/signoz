package notify

import (
	"context"
	"sync"
)

// Fake is an in-memory Notifier for tests: it records every call instead of
// delivering anywhere. Other tracks (RCA, Act) can depend on the Notifier
// interface and use Fake in their own tests before a real adapter (e.g.
// Slack) is wired up (PRD section 22: adapter contract tests with a fake
// transport).
type Fake struct {
	mu             sync.Mutex
	Diagnoses      []Diagnosis
	Indeterminates []IndeterminateReason

	// Err, if set, is returned by both methods instead of recording the
	// call, to test caller error handling.
	Err error
}

// NewFake returns a ready-to-use Fake notifier.
func NewFake() *Fake {
	return &Fake{}
}

func (f *Fake) NotifyDiagnosis(_ context.Context, d Diagnosis) error {
	if f.Err != nil {
		return f.Err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Diagnoses = append(f.Diagnoses, d)
	return nil
}

func (f *Fake) NotifyIndeterminate(_ context.Context, r IndeterminateReason) error {
	if f.Err != nil {
		return f.Err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Indeterminates = append(f.Indeterminates, r)
	return nil
}

// LastDiagnosis returns the most recently recorded diagnosis and true, or a
// zero value and false if none was recorded.
func (f *Fake) LastDiagnosis() (Diagnosis, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.Diagnoses) == 0 {
		return Diagnosis{}, false
	}
	return f.Diagnoses[len(f.Diagnoses)-1], true
}

// LastIndeterminate returns the most recently recorded indeterminate
// notification and true, or a zero value and false if none was recorded.
func (f *Fake) LastIndeterminate() (IndeterminateReason, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.Indeterminates) == 0 {
		return IndeterminateReason{}, false
	}
	return f.Indeterminates[len(f.Indeterminates)-1], true
}

// compile-time check that Fake satisfies Notifier.
var _ Notifier = (*Fake)(nil)
