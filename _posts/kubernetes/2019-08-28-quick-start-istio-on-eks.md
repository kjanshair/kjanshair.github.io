---
layout:     post
title:      "Quick Start: Setting up Istio on EKS"
date:       2019-08-28
comments: true
author:     "Janshair Khan"
color: "#4853C2"
---

Service Mesh technologies are popular (but not only) in Microservice architecture. Service Mesh tools such as Istio, AWS AppMesh and others are getting momentum and a lot of attention with the rise of Microservice architecture and Kubernetes as it solves most common problems that we face while we adopt Microservice architecture.

In this quick start post, we will see how do we setup Istio Mesh on AWS EKS. Let's start by creating an EKS cluster.

## Setting up an EKS cluster

We will use <a href="https://eksctl.io/" class="underline" target="_blank">`eksctl`</a> utility to provision an EKS cluster. Use the command:

```bash
eksctl create cluster -n=istio-demo -r=us-west-2 -N=2 -m=2 -M=2 -t=t2.medium --ssh-access --ssh-public-key=~/.ssh/id_rsa.pub --nodegroup-name=istio-demo-group --vpc-public-subnets=subnet-xxxxxxxxxxxxxxxxx,subnet-xxxxxxxxxxxxxxxxx,subnet-xxxxxxxxxxxxxxxxx,subnet-xxxxxxxxxxxxxxxxx --asg-access --external-dns-access --full-ecr-access --appmesh-access --alb-ingress-access
```

Replace all subnets `subnet-xxxxxxxxxxxxxxxxx` (or region if required) in the command by your public subnet IDs of the VPC (I have 4 subnets in 4 AZs of us-west-2 region) or allow `eksctl` to create a dedicated VPC for you by removing these options. Run the command to provision the EKS cluster. This will put the `kubeconfig` for you in the `~/.kube/kubeconfig` directory.

If everything goes well, check with the command:

```bash
kubectl get nodes
```

To verify you have 2 nodes EKS cluster up and running in AWS. Next we will install Helm (*Tiller*) which is a package manager for Kubernetes. We will use Helm to install Istio and other softwares on EKS.

## Installing Helm

Installing Helm on a Kubernetes is easy. Simply create a service account for Tiller by running:

```bash
kubectl -n kube-system create serviceaccount tiller
```

And a `ClusterRoleBindings` for Tiller by running:

```bash
kubectl create clusterrolebinding tiller --clusterrole cluster-admin --serviceaccount=kube-system:tiller
```

Finally run `helm init` to initialize Helm on Kubernetes:

```bash
helm init --service-account tiller
```

Check the status of Tiller pod by the name something like `tiller-deploy-xxxxxxxxx-xxxxx` in `kube-system` namespace with:

```bash
kubectl get pods -n kube-system
```

Once tiller pod is running. Run the command:

```bash
helm list
```

To verify Helm is setup and ready to use. Next, we will install `metrics-server` on the cluster.

## Installing `metrics-server`

Before deploying Istio on the cluster, Istio has some HPA resources which needs cluster-level resource usage data. `metrics-server` is a cluster-wide aggregator of resource usage data which will provide this usage data to Istio's HPA resources. To deploy `metrics-server` on EKS, simply run the Helm command:

```bash
helm install stable/metrics-server --name metrics-server --namespace kube-system --set "args={--kubelet-preferred-address-types=InternalIP}"
```

This will install `metrics-server` in `kube-system` namespace of the cluster. Run:

```bash
helm list
```

To check the status of the `metrics-server` release. `metrics-server` is necessary to be installed first for Istio.

## Installing Istio

Now let's install Istio on EKS. We need to download Istio on our system. At the time of writing, latest version for Istio is `istio-1.2.5`, download the file from the <a href="https://github.com/istio/istio/releases/" class="underline" target="_blank">release page</a> with the commands:

```bash
curl -LO https://github.com/istio/istio/releases/download/1.2.5/istio-1.2.5-linux.tar.gz
```

Extract the file and navigate to the `istio-1.2.5` directory:

```bash
tar -xzvf istio-1.2.5-linux.tar.gz
```

We need to install 2 Helm releases for Istio on the EKS cluster `istio-init` and `istio`. The `istio-init` release installs necessary Kubernetes CRDs to let Kubernetes know about Istio Custom Resources. This way, we can use Istio with `kubectl` utility and create Kubernetes manifests for Istio objects such as `virtual-service`. To install Istio CRDs, use the command:

```bash
helm install install/kubernetes/helm/istio-init --name istio-init --namespace istio-system
```

Verify `istio-init` installation with:

```bash
kubectl get crds --namespace istio-system | grep 'istio.io'
```

Once CRDs are ready, we can install Istio with Helm by running:

```bash
helm install install/kubernetes/helm/istio --name istio --namespace istio-system --set global.configValidation=false --set sidecarInjectorWebhook.enabled=true --set grafana.enabled=true --set servicegraph.enabled=true
```

This will install Istio with necessary components such as Grafana, Sidecar injector, Istio Pilot, Mixer etc. In the `istio-system` namespace of the cluster. Istio will also install an *Ingress Controller* attached with an AWS ELB for getting traffic into the cluster from the Internet.

## Labeling the `default` namespace for Envoy sidecar injection

Since we have installed Istio with `--set sidecarInjectorWebhook.enabled=true` option, we can now automatically inject Envoy sidecar proxies into the pods of a namespace that has the label `istio-injection=enabled`. We will use the `default` namespace. To allow automatic Envoy sidecar injection for all pods inside the `default` namespace. Execute the command:

```bash
kubectl label namespace default istio-injection=enabled
```

We will install the sample `hello world` app in the `default` namespace.  

## Installing a Hello World App

Now let's install a sample `hello world` app that comes with the Istio installation. This `hello world` app is very easy to install. Simply run the command:

```bash
kubectl apply -f samples/helloworld/helloworld-gateway.yaml -f samples/helloworld/helloworld.yaml
```
To verify the installation, run:

```bash
kubectl get pods -n default
```

You will see a similar output as shown below:

```bash
NAME                             READY   STATUS    RESTARTS   AGE
helloworld-v1-b6c7975c7-kj56s    2/2     Running   0          42m
helloworld-v2-78bfccd65f-9j72h   2/2     Running   0          42m
```

As you can see, each pod has 2 containers. An application container and the Envoy proxy container (in the form of `istio/proxyv2`). This is because proxy container was injected automatically because of the label we assigned to the `default` namespace. Let's verify with Grafana to check if we are lucky enough to get the metrics about the application from Istio.

Run the command to open-up Grafana:

```bash
kubectl port-forward grafana-xxxxxxxxx-xxxxx 3000:3000 -n istio-system
```

Navigate to `localhost:3000` and select `istio-mesh` Dashboard. You will see something similar as shown below:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.azureedge.net/kubernetes/quick-start-istio-on-eks/1.png" alt="1" class="img-responsive center-block"/>
{% endif %}

You will see **N\A** for each application metric from Istio. This is because we haven't generated any traffic.

To access the application, navigate to the DNS name of the AWS ELB which was provisioned when we installed Istio which is attached to the Kubernetes Ingress Controller and access with:

```bash
curl xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxx.us-west-2.elb.amazonaws.com/hello
```

You will see a similar output as:

```bash
Hello version: v1, instance: helloworld-v1-b6c7975c7-kj56s
Hello version: v2, instance: helloworld-v2-78bfccd65f-9j72h
```

Hit the endpoint in the browser or with `cURL` couple of times and check the Istio Mesh Dashboard in Grafana. After a couple of seconds, you will begin see some data:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.azureedge.net/kubernetes/quick-start-istio-on-eks/2.png" alt="2" class="img-responsive center-block"/>
{% endif %}

Go through the other dashboards in Grafana to further check metrics of the `hello world` service that we just deployed.

## Distributed Tracing with Jaeger

We can also trace service communications with Istio. Istio uses Jaeger as backend for tracing with other backend options available such as Zipkin and LightStep. We haven't enabled tracing while installing Istio, we can enable tracing at any time after the installing by running:

```bash
helm upgrade istio install/kubernetes/helm/istio --set tracing.enabled=true
```

This will run another pod in the `istio-system` namespace by the name something like `istio-tracing-xxxxxxxxxx-xxxxx`. Port forward the pod by running:

```bash
kubectl port-forward istio-tracing-595796cf54-5dpzm 15032:16686
```

And navigate to `http://localhost:15032/` and find the tracing for `hello world` service as shown below:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.azureedge.net/kubernetes/quick-start-istio-on-eks/3.png" alt="3" class="img-responsive center-block"/>
{% endif %}

And click **Find Traces** at the bottom. You will see a similar tracing Dashboard for `hello world` app as shown below:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.azureedge.net/kubernetes/quick-start-istio-on-eks/4.png" alt="4" class="img-responsive center-block"/>
{% endif %}

## Conclusion\Clean Up

Istio has rich features and capabilities that a full-fledge production-ready service mesh needs such as like Circuit-Breaking, Canary Deployments, Telemetry, Security and Policy Enforcement.

To clean up the environment, simply delete the EKS cluster with `eksctl`:

```bash
eksctl delete cluster istio-demo -r us-west-2
```
Learn more about Istio from the official <a href="https://istio.io" class="underline" target="_blank">docs</a>.

{% if jekyll.environment == "production" %}
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}