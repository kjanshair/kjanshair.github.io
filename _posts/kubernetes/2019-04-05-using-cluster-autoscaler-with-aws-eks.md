---
layout:     post
title:      "Using cluster-autoscaler with AWS EKS"
date:       2019-04-05
comments: true
author:     "Janshair Khan"
color: "#F0B500"
---

Running Kubernetes on Amazon AWS is easier than ever with managed AWS Container Service for Kubernetes or EKS. Kubernetes has 2 parts: **Control Plane** & **Worker Nodes** so like AWS EKS has. With EKS, Control Plane is managed for us by AWS. Workers nodes are AWS EC2 instances running Pods\Containers which hold the applications. Worker nodes have limits because AWS EC2 compute service has limited computing resources such as CPU & Memory. Sometimes it is difficult analyze how much worker nodes do we need to make the application capable of dealing with traffic spikes or otherwise, we might pay more for using compute resources than we actually need. This is where we use Kubernetes `cluster-autoscaler` which enables us to dynamically create & destroy EC2 instances on-demand to meet the needs and save cost. In this post we will see how do we setup `cluster-autoscaler` on Kubernetes with AWS EKS from the very start.

## Setting up an EKS cluster

You can create an EKS cluster on AWS easily with <a href="https://eksctl.io/" class="underline" target="_blank">eksctl</a> utility. Below command creates an EKS cluster with 4 subnets of an existing VPC in Oregon region which has currently 4 AZs:

```bash
eksctl create cluster -n=ca-example -r=us-west-2 -N=2 -m=2 -M=100 -t=t2.small --ssh-access --ssh-public-key=~/.ssh/id_rsa.pub --nodegroup-name=ca-example --vpc-public-subnets=subnet-xxxxxxxxxxxxxxxxx,subnet-xxxxxxxxxxxxxxxxx,subnet-xxxxxxxxxxxxxxxxx,subnet-xxxxxxxxxxxxxxxxx --asg-access --external-dns-access --full-ecr-access --appmesh-access --alb-ingress-access
```

This would create an EKS cluster with 2 minimum & 100 maximum worker nodes in an AWS ASG or Auto-Scaling Group. After the cluster is created with `eksctl`, Kubernetes `kubeconfig` file would be placed at the path `~/.kube/kubeconfig`. Set the `KUBECONFIG` environment variable to the kubeconfig file with `export KUBECONFIG=~/.kube/kubeconfig` or if you want to permanently set to the same path, add it to the `~/.bashrc` file.

Next we need `helm` & `tiller` to be installed on our local system & on EKS. You can learn how to install `helm` & `tiller` on Kubernetes from <a href="https://helm.sh/docs/using_helm/" class="underline" target="_blank">here</a>.

Now we have the EKS cluster with 2 worker nodes, we need to setup `cluster-autoscaler` on EKS so that if there are Pods  that are unscheduled on a currently active worker node, EKS will dynamically provision one or more new worker nodes and run pending Pods on those worker node.

## Installing `cluster-autoscaler` on EKS

We will be installing `cluster-autoscaler` on EKS using `helm`. We have 2 ways for making worker nodes auto-scalable here:

- Using single AWS ASG (Auto Scaling Group)
- Using Auto-Discovery tags with ASG

### Using single AWS ASG

When creating an EKS cluster, worker nodes usually reside in an AWS ASG or Auto-Scaling Group that has the ability to scales-out & scales-in automatically on-demand. Using single ASG method, *we need to pass the name of ASG* that was created with EKS with minimum and maximum nodes to the CA while deploying using Helm. We need to know the name of the ASG against which we would be enabling Auto-Scaling for worker nodes which we can get from AWS Management Console as shown:

<img src="https://kjanshair.azureedge.net/kubernetes/using-cluster-autoscaler-with-aws-eks/2.png" alt="ca-example-2" class="img-responsive center-block"/>

To install CA on EKS, run the below Helm command to install and replace `<asg-name>` by your worker node ASG name:

```bash
helm install stable/cluster-autoscaler --name ca --set autoscalingGroups[0].name=<asg-name>,autoscalingGroups[0].maxSize=10,autoscalingGroups[0].minSize=3,sslCertPath=/etc/ssl/certs/ca-bundle.crt,rbac.create=true,awsRegion=us-west-2 --namespace=kube-system
```

A CA Pod will start running inside `kube-system` namespace which enables worker nodes AutoScaling in AWS EKS. You can check the scalability of the worker nodes by running more Pods than existing worker nodes can handle.

### Using Auto-Discovery tags with ASG

The other way is using Auto-Discovery of `cluster-autoscaler`. This approach is relatively easier than the previous one. *It is important to note that Auto-Discovery only works with AWS provider*.
Auto-Discovery works with the **AWS tags** assigned to the ASG. For Auto-Discovery to work, we must assigns **2 tag keys** to the worker nodes ASG:

- `k8s.io/cluster-autoscaler/enabled`
- `kubernetes.io/cluster/<your-cluster-name>`

Value of the tag doesn't matter. These 2 keys must be present for Auto-Discovery to work. These keys are automatically added to the AWS ASG when we pass `--asg-access` flag to `eksctl create cluster` command (as we did at the beginning):

<img src="https://kjanshair.azureedge.net/kubernetes/using-cluster-autoscaler-with-aws-eks/1.png" alt="ca-example-1" class="img-responsive center-block"/>

Now run the below Helm command and pass the cluster name (`ca-example` in our case) to the Helm command to install `cluster-autoscaler` using Auto-Discovery method:

```bash
helm install stable/cluster-autoscaler --name ca --set autoDiscovery.clusterName=ca-example,awsRegion=us-west-2,sslCertPath=/etc/ssl/certs/ca-bundle.crt,rbac.create=true --namespace=kube-system
```

This would make worker nodes auto-scale on EKS as we can see below:

<img src="https://kjanshair.azureedge.net/kubernetes/using-cluster-autoscaler-with-aws-eks/3.png" alt="ca-example-3" class="img-responsive center-block"/>

Auto-discovery finds ASG tags and automatically manages them based on the minimum and maximum size specified in the ASG.

## Conclusion

Above 2 methods for install `cluster-autoscaler` enables High-Availability comprises of all the Availability Zones running worker nodes in the form EC2 instance. Installing `cluster-autoscaler` on EKS helps dealing with traffic spikes and with good integration with AWS services such as ASG, it becomes easier to install & configure `cluster-autoscaler` on Kubernetes.

{% if jekyll.environment == "production" %}
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}