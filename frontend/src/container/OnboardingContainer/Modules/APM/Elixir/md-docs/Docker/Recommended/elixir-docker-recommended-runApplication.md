Once you update your Dockerfile, you can build and run it using the commands below.

&nbsp;

### Step 1: Build your dockerfile

Build your docker image

```bash
docker build -t <your-image-name> .
```

- `<your-image-name>` is the name of your Docker Image

&nbsp;

### Step 2: Run your docker image

```bash
docker run <your-image-name>
```

&nbsp;

To see some examples for instrumented applications, you can checkout [this link](https://signoz.io/docs/instrumentation/elixir/#sample-examples)