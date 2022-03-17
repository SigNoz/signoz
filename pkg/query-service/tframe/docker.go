package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const (
	composeFile = "./test-deploy/docker-compose.yaml"
	prefix      = "signoz_test"
)

func getCmd(args ...string) *exec.Cmd {
	cmd := exec.CommandContext(context.Background(), args[0], args[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()
	return cmd
}

func startCluster() error {
	cmd := getCmd("docker-compose", "-f", composeFile, "-p", prefix,
		"up", "--force-recreate", "--build", "--remove-orphans", "--detach")

	fmt.Printf("Starting signoz cluster...\n")
	if err := cmd.Run(); err != nil {
		fmt.Printf("While running command: %q Error: %v\n", strings.Join(cmd.Args, " "), err)
		return err
	}
	fmt.Printf("CLUSTER UP\n")
	return nil
}

func stopCluster() {
	cmd := getCmd("docker-compose", "-f", composeFile, "-p", prefix, "down", "-v")
	if err := cmd.Run(); err != nil {
		fmt.Printf("Error while stopping the cluster. Error: %v\n", err)
	}
	fmt.Printf("CLUSTER DOWN: %s\n", prefix)
}
