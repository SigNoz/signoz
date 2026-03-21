package errors

import (
	"fmt"
	"runtime"
	"strings"
)

// stacktrace holds a snapshot of program counters.
type stacktrace []uintptr

// newStackTrace captures a stack trace, skipping 3 frames to record the
// snapshot at the origin of the error:
// 1. runtime.Callers
// 2. newStackTrace
// 3. the constructor (New, Newf, Wrapf, Wrap)
//
// Inspired by https://github.com/thanos-io/thanos/blob/main/pkg/errors/stacktrace.go
func newStackTrace() stacktrace {
	const depth = 16
	pc := make([]uintptr, depth)
	n := runtime.Callers(3, pc)
	return stacktrace(pc[:n:n])
}

// String formats the stacktrace as function/file/line pairs.
func (s stacktrace) String() string {
	var buf strings.Builder
	frames := runtime.CallersFrames(s)
	for {
		frame, more := frames.Next()
		fmt.Fprintf(&buf, "%s\n\t%s:%d\n", frame.Function, frame.File, frame.Line)
		if !more {
			break
		}
	}
	return buf.String()
}
