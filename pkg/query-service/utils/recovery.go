package utils

import (
	"runtime/debug"
)

func RecoverPanic(callback func(err interface{}, stack []byte)) {
	if r := recover(); r != nil {
		if callback != nil {
			callback(r, debug.Stack())
		}
	}
}
