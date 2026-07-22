package main

import (
	"flag"
	"log/slog"
	"net/http"
	"os"

	"github.com/guruvedhanth-s/reliability-agent/internal/api"
	"github.com/guruvedhanth-s/reliability-agent/internal/profile"
	"github.com/guruvedhanth-s/reliability-agent/internal/registry"
)

func main() {
	listen := flag.String("listen", ":8081", "HTTP listen address")
	profileFile := flag.String("profile", "", "optional profile YAML to load at startup")
	flag.Parse()

	profiles := registry.New()
	if *profileFile != "" {
		p, err := profile.LoadFile(*profileFile)
		if err != nil {
			slog.Error("load profile", "error", err)
			os.Exit(1)
		}
		if err := profiles.Put(p); err != nil {
			slog.Error("register profile", "error", err)
			os.Exit(1)
		}
	}

	slog.Info("reliability-agent listening", "address", *listen)
	if err := http.ListenAndServe(*listen, api.New(profiles)); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
