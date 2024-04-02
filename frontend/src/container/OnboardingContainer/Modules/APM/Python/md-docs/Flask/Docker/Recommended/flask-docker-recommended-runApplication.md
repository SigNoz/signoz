Once you update your Dockerfile, you can build and run it using the commands below.

### Step 1: Build your dockerfile

Build your docker image

```bash
docker build -t <your-image-name> .
```

- `<your-image-name>` is the name of your Docker Image

&nbsp;

### Step 2: Run your docker image

The Docker run command starts a container in detached mode (-d) and maps port 5000 of the host to port 5000 of the container.

```bash
docker run -d -p 5000:5000 <your-image-name>
```

**Note**

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/flask/#troubleshooting-your-installation) for assistance.
