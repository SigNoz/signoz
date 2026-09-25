package main

import "testing"

func TestIsLoopbackListen(t *testing.T) {
	for _, test := range []struct {
		address string
		want    bool
	}{
		{address: "127.0.0.1:8081", want: true},
		{address: "localhost:8081", want: true},
		{address: "[::1]:8081", want: true},
		{address: ":8081", want: false},
		{address: "0.0.0.0:8081", want: false},
	} {
		if got := isLoopbackListen(test.address); got != test.want {
			t.Fatalf("isLoopbackListen(%q) = %v, want %v", test.address, got, test.want)
		}
	}
}
