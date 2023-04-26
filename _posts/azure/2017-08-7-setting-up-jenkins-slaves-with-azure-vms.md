---
layout:     post
title:      "Setting up Jenkins Slaves with Azure VMs"
date:       2017-08-7
comments: true
author:     "Janshair Khan"
color: "#CB3837"
---

## What is Jenkins and what are Jenkins Build Slaves?

Jenkins is a free, open-sourced and Java based CI\CD (Continuous Integration and Continuous Deployment) tool which we can use on our servers either with on-premises or in the cloud to build, test and deliver applications.

On a typical Jenkins server, if there are more than one projects and all of them triggered simultaneously then the Jenkins may require more computational resources than the hosted server one has already in order to build them. For this, we use <strong>Jenkins Slaves Machines</strong> (Master Slaves Architecture) to distribute build load among other Jenkins instances. This is what we're going to see here.

## Launching Jenkins Slaves via SSH

For a demo, I have 3 Linux instances of the same size running in Microsoft Azure. Each of them has Jenkins up and running. You can do this yourself by either installing Jenkins manually or use an ARM (Azure Resource Manager) template from <a href="https://azure.microsoft.com/en-us/resources/templates/" class="underline" target="_blank">Azure Quick Start</a> templates. 

The Linux instances are:

- In the same Azure VNet (Virtual Network) and Subnet
- One instance is **Jenkins Master** and other 2 are **Slaves**
- Instances are reachable to each other via private IP addresses because they all are in the same Subnet
- *Master* has IP 10.0.0.4, *Slave1* has IP 10.0.0.5 and *Slave2* has IP 10.0.0.6.
- *Jenkins Masters* can login into slaves as **jenkins users** via SSH

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/2.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

Make sure that these VMs are pingable from their private IP addresses.

Next go the Jenkins master instance and navigate to:

***Home => Manage Jenkins => Manage Nodes***

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/3.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

Click *New Node*: Type a name (such as slave1) and check the permanent node radio button. This, in a nutshell, means that you are utilizing a physical Jenkins instance as slave and hit *OK*.

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/4.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

You will be shown a bunch of information on the very next page. We'll cover the necessary information needed here to provision a slave as follows:

- **# of executors**: The maximum number of concurrent builds that Jenkins may perform on this agent. 
- **Usage**: Controls how Jenkins schedules builds on this node.
- **Remote root directory**: Home directory of Jenkins slave (Usually */var/lib/jenkins*)
- **Launch Method**: Ways to launch Jenkins slave machines, we will use here *Launch Slave agents via SSH*
- **Availability**: Controls when Jenkins starts and stops this agent.

Other input's description on this page is apparent and you can enter your own values. Now we need to configure SSH via Jenkins credentials.

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/5.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

## Adding Jenkins SSH Credentials

Now we have chosen the launch method as SSH. Next, we need to tell Jenkins that how to communicate with slave machines via SSH or where to find SSH keys in order to setup a Jenkins slave. This is where we need to add credentials for SSH login.

Click the **Add** drop down, and click **Jenkins**. A Jenkins credential provider pop-up will appear and select:

- **Kind** as *SSH Username with private key*
- Set the **Username** as *jenkins* because we have setup SSH keys against Jenkins user inside Jenkins instances.
- Select **From the Jenkins master ~/.ssh** in the Private Key because we used *ssh-keygen* to generate public\private SSH keys to the default root location and leave everything else as it is because we have not provided anything else while generating SSH keys such as passphrase etc.
- Finally enter host for Jenkins slave1 as *10.0.0.5*

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/6.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

After entering credentials, you have to select that newly entered credentials for connecting with Jenkins slaves inside the same network as shown below:

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/7.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

Click save and you will see that a Jenkins slave (*slave1*) is attached with the master.

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/8.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

Repeat the same steps (or use a copy of slave1 instead of permanent node after clicking *New node*) for attaching slave2 with the host IP 10.0.0.6 *with the same Jenkins credentials*.

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/9.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

When selecting a copy of an existing slave, all the attributes are represented on the next page after clicking *OK*.

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/10.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

Modify necessary attributes (**Host** in our case), hit save and you will see that both slaves are not attached with the master node.

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/11.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

## Running a Test Pipeline

Now we have our Master-Slave Jenkins instances up and running, we will finally write a super simple *Jenkinsfile* displaying the node instance where the job is running to make sure that the build loads are divided across newly attached Jenkins slaves. Hence go to:

***Jenkins_home => new item => provide a name and select pipeline project***

Go to configure section of the project and write the below script in the pipeline script:

```groovy
node {
    stage ('display') {
        echo "NODE_NAME = ${env.NODE_NAME}"
    }
}
```

Hit save, build the project a couple of times and you will see that the node names are different on some builds that's because build load is being divided among 2 Jenkins slaves.

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/12.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

{% if jekyll.environment == "production" %}
<img src="{{ site.cdnurl }}/azure/setting-up-jenkins-slaves-with-azure-vms/13.png" alt="jenkins-slave-arch" class="img-responsive center-block"/>
{% endif %}

## Conclusions

Setting up Jenkins slaves really improves the overall performance of a CI system. Other CI systems such as CircleCI, VSTS etc. support **Build Agents** to divide your build loads across agents and make them able to run concurrently. The difference is that others are paid (Usually if more than 1 build agents are required) and Jenkins is free. But you have to create servers for your Jenkins CI yourself. 

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}
