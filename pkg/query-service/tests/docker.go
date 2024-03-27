package tests

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"log"

	minio "github.com/minio/minio-go/v6"
)

const (
	prefix        = "signoz_test"
	minioEndpoint = "localhost:9100"
	accessKey     = "ash"
	secretKey     = "password"
	bucketName    = "test"
)

var (
	minioClient *minio.Client
	composeFile string
)

func init() {
	goArch := runtime.GOARCH
	if goArch == "arm64" {
		composeFile = "./test-deploy/docker-compose.arm.yaml"
	} else if goArch == "amd64" {
		composeFile = "./test-deploy/docker-compose.yaml"
	} else {
		log.Fatalf("Unsupported architecture: %s", goArch)
	}
}

func getCmd(args ...string) *exec.Cmd {
	cmd := exec.CommandContext(context.Background(), args[0], args[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()
	return cmd
}

func startMinio() error {
	log.Printf("Starting minio")
	cmd := getCmd("docker", "run", "-d", "-p", "9100:9000", "-p", "9101:9001",
		"--name", "signoz-minio-test", "-e", "MINIO_ROOT_USER=ash",
		"-e", "MINIO_ROOT_PASSWORD=password",
		"quay.io/minio/minio", "server", "/data", "--console-address", ":9001")

	if err := cmd.Run(); err != nil {
		return err
	}

	var err error
	minioClient, err = minio.New(minioEndpoint, accessKey, secretKey, false)
	if err != nil {
		return err
	}
	if err = minioClient.MakeBucket(bucketName, ""); err != nil {
		return err
	}
	return nil
}

func startCluster() error {
	if err := os.MkdirAll("./test-deploy/data/minio/test", 0777); err != nil {
		return err
	}

	if err := startMinio(); err != nil {
		return err
	}

	cmd := getCmd("docker-compose", "-f", composeFile, "-p", prefix,
		"up", "--force-recreate", "--build", "--remove-orphans", "--detach")

	log.Printf("Starting signoz cluster...\n")
	if err := cmd.Run(); err != nil {
		log.Printf("While running command: %q Error: %v\n", strings.Join(cmd.Args, " "), err)
		return err
	}

	client := http.Client{}
	for i := 0; i < 10; i++ {
		if _, err := client.Get("http://localhost:8180/api/v1/health"); err != nil {
			time.Sleep(2 * time.Second)
		} else {
			log.Printf("CLUSTER UP\n")
			return nil
		}
	}
	return fmt.Errorf("query-service is not healthy")
}

func stopCluster() {
	cmd := getCmd("docker-compose", "-f", composeFile, "-p", prefix, "down", "-v")
	if err := cmd.Run(); err != nil {
		log.Printf("Error while stopping the cluster. Error: %v\n", err)
	}
	if err := os.RemoveAll("./test-deploy/data"); err != nil {
		log.Printf("Error while cleaning temporary dir. Error: %v\n", err)
	}

	cmd = getCmd("docker", "container", "rm", "-f", "signoz-minio-test")
	if err := cmd.Run(); err != nil {
		log.Printf("While running command: %q Error: %v\n", strings.Join(cmd.Args, " "), err)
	}

	log.Printf("CLUSTER DOWN: %s\n", prefix)
}
