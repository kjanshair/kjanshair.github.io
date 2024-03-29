---
layout:     post
title:      "Using Helm, Helm Repositories and ChartMuseum"
date:       2019-02-12
comments: true
author:     "Janshair Khan"
color: "#0B349A"
---

## Kubernetes Package Management with Helm

<a href="https://helm.sh/" class="underline" target="_blank">Helm</a> is a package manager for Kubernetes. What do we really mean by a Package Manager for Kubernetes? Package management is a broad-term in the context of software eco-system. How package management is related to Kubernetes? Let's simplify this with the help of a practical example.

Kubernetes has a number of native-objects such as `Ingress`, `Deployments`, `DaemonSets`, `StatefulSets` etc, that you use to structure your application on a cluster. Usually each Kubernetes object has it's own YAML manifest file that you create and manage independently. When you have a small application like around 5 or more Microservices on running on Kubernetes, it is fine to go along with these manifest files. But as your application grows and more and more Microservices are added and more expected to come or you may be willing to add more Kubernetes objects (such as `Operators` to support Stateful applications etc) into your application, managing these objects with their individual manifest files becomes challenging. Editing properties of each object by modifying the manifests files to structure applications is cumbersome. This is where we use package managers Kubernetes. Let's understand the basics first.

In the context of package managers for Kubernetes, usually each Microservice is treated as a *separate stand-alone package*. A package defines everything (Kubernetes objects) that a Microservice needs to run on Kubernetes. Examples include the `Ingress` path, `Service` types and ports, `Deployment` replicas etc. All these objects required by a Microservice are collectively managed and deployed as a stand-alone package by package managers and <a href="https://helm.sh/" class="underline" target="_blank">Helm</a> is a tool which works as a package manager for Kubernetes.

### Helm and Helm Charts

Helm is an open-source, cloud-native tool used for package management on Kubernetes. Helm refers a service package as **Charts** with all of its components. A Helm chart usually contains multiple Kubernetes objects. These set of objects are deployed with a single `helm` command unlike you do with `kubectl` one-by-one.

> Check <a href="https://github.com/helm/helm" class="underline" target="_blank">here</a> to know about Helm installation for your particular OS.

Helm uses templates through which you pass values to the chart to tweak each object's properties on Kubernetes. Below is an example of a Helm chart for deploying <a href="https://traefik.io/" class="underline" target="_blank">Traefik</a> Ingress Controller on a Kubernetes cluster.

```bash
helm install traefik stable/traefik --set dashboard.enabled=true,dashboard.domain=traefik.dashboard,rbac.enabled=true --namespace=kube-system
```

This command will do the rest of the deployments on Kubernetes (i.e. Deploy a `service` object of type `LoadBalancer`, a Traefik `deployment` object, an `Ingress` controller and more) for you which makes deployments, automation, rolling updates and rollbacks all at once much easier as each chart is version controlled independently. The complete life-cycle of a Helm chart and Helm components (such as Charts, Releases etc) can be found at the awesome <a href="https://docs.helm.sh/" class="underline" target="_blank">Helm Documentation</a>.

### Helm Repositories
Helm charts are found in **Helm Repositories**. A Helm repository could be a public repository or a private repository or could be a self-hosted and managed repository just like a Git repository. There is a default and a public Helm chart repository that Helm uses by default when it is installed called **<a href="https://github.com/helm/charts/tree/master/stable" class="underline" target="_blank">stable</a>** where you can find dozens of pre-build Helm charts for most common use-cases with respective open-source tools. An example of Traefik Ingress Controller that we just saw contained the word `stable` in the name of the chart that refers to the default\main Helm repository.

### Hosting a private Helm Repository with ChartMuseum

Let's see how you can host your own private Helm Chart Repository for your business needs and how you can configure locally installed Helm CLI to access the charts in that repository. A private Helm repository is backed by a storage system. That storage system could be your local or remote filesystem, a block storage or could be a public cloud storage service (AWS S3, Azure Storage Account etc). To simplify private Helm repository management, we will use **<a href="https://chartmuseum.com/" class="underline" target="_blank">ChartMuseum</a>** tool developed by Codefresh.

ChartMuseum has a single stand-alone binary written in Go that you download and install. In this post, you will setup a private Helm repository backed by an Azure Blob Storage and charts managed by ChartMuseum.

Installing ChartMuseum is pretty straightforward. You can get ChartMuseum via GoFish with a single command:

```bash
gofish install chartmuseum
```

Or download the official Docker image:

```bash
docker image pull chartmuseum/chartmuseum:latest
```

We will be using the docker way of starting ChartMuseum on our system. We will pass Azure Storage Account Name and the Key to ChartMuseum for authentication with the Azure storage account. Below is the `docker-compose.yml` file with all the necessary attributes for ChartMuseum:

```yaml
version: '3'
services:
  chartmuseum:
    image: chartmuseum/chartmuseum:latest
    container_name: chartmuseum
    networks:
     - chartmuseum-net
    ports:
     - 8080:8080
    environment:
      PORT: 8080
      DEBUG: 1
      STORAGE: microsoft
      AZURE_STORAGE_ACCOUNT: ${AZURE_STORAGE_ACCOUNT} 
      AZURE_STORAGE_ACCESS_KEY: ${AZURE_STORAGE_ACCESS_KEY} 
      STORAGE_MICROSOFT_CONTAINER: charts
      STORAGE_MICROSOFT_PREFIX: ""

networks:
  chartmuseum-net:
```

This compose file uses environment variables to pass the storage account name and the key to the ChartMuseum container. Run the `docker-compose.yml` file with the command `docker-compose up -d`.

Now you have ChartMuseum up and running. Now you need to add the repository URL of this container to the Helm CLI. Run the below command to add the repository and replace `<repository-name>` by your custom name (such as `myrepo`):

```bash
helm repo add <repository-name> http://localhost:8080
```

This will output the text to stdout saying the repository has been added. Run the below command to list the added repositories:

```bash
helm repo list
```

You will see `<repository-name>` prefix in the list. Now update all the charts in all repositories by running the command:

```bash
helm repo update
```

You now have the remote repository setup. Let's upload a simple custom user-defined chart to the newly created repository.

### Uploading a custom chart to the private Helm Repository

Navigate to a folder and generate a simple chart by running (We will use the name `go`, but you can choose any name you want):

```bash
helm create go
```

This chart contains a `deployment` object, a `service` and a `ingress` object for a Microservice. If you have Kubernetes cluster up & running, you can *test* the chart by running:

```bash
helm install nginx --set image.repository=nginx,image.tag=latest,ingress.enabled=true,ingress.path=/,ingress.hosts[0]=nginx.home . --namespace=dev
```

Now you have a chart ready for upload to the repository. Now you will package this chart and upload it to the Helm repository via ChartMuseum's HTTP endpoint.

Before packaging the chart, make sure you modify the information about the chart in the `Chart.yml` file. This file contains necessary information such as chart author, chart version etc. For simplicity, we will keep everything as default. Run the below command at the root of the chart directory to package the chart:

```
helm package .
```

You will get a `go-0.1.0.tgz` packaged file. Simply upload this file to the repository using `cURL` with the command:

```bash
curl --data-binary "@go-0.1.0.tgz" http://localhost:8080/api/charts
```

This command will return a JSON response saying that the chart is uploaded to the repository. Uploaded packaged chart can be viewed in the Azure Blob Storage:

{% if jekyll.environment == "production" %}
  <img src="{{ site.cdnurl }}/misc/using-helm-helm-repositories-and-chartmuseum/1.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}


## Conclusion
Helm package manager greatly simplifies managing application deployments on Kubernetes. ChartMuseum tool is a great tool for managing self-hosted Helm repositories. ChartMuseum supports several popular backends with the support of other Cloud Storage Solutions such as AWS S3, Google Cloud Storage and more. Follow the **<a href="https://chartmuseum.com/docs/" class="underline" target="_blank">docs</a>** to learn more about ChartMuseum.


{% if jekyll.environment == "production" %}
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}