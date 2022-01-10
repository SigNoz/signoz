# Github actions

## Testing the UI manually on each PR

First we need to make sure the UI is ready
* Check the `Start tunnel` step in `e2e-k8s/deploy-on-k3s-cluster` job and make sure you see `your url is: https://pull-<number>-signoz.loca.lt`
* This job will run until the PR is merged or closed to keep the local tunneling alive
    - github will cancel this job if the PR wasn't merged after 6h
    - if the job was cancel, go to the action and press `Re-run all jobs`

Now you can open your browser at https://pull-<number>-signoz.loca.lt and check the UI.

##  Environment Variables

To run GitHub workflow, a few environment variables needs to add in GitHub secrets

<table>
  <tr>
    <th> Variables </th>
    <th> Description </th>
    <th> Example </th>
  </tr>
  <tr>
    <td> REPONAME </td>
    <td> Provide the DockerHub user/organisation name of the image. </td>
    <td> signoz</td>
  </tr>
  <tr>
    <td> DOCKERHUB_USERNAME </td>
    <td> Docker hub username </td>
    <td> signoz</td>
  </tr>
  <tr>
    <td> DOCKERHUB_TOKEN </td>
    <td> Docker hub password/token with push permission </td>
    <td> **** </td>
  </tr>
  <tr>
    <td> SONAR_TOKEN </td>
    <td> <a href="https://sonarcloud.io">SonarCloud</a> token </td>
    <td> **** </td>
  </tr>
