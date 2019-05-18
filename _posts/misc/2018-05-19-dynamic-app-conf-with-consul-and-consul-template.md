---
layout:     post
title:      "Dynamic application configurations with Consul KV store and consul-template"
date:       2018-05-24
comments: true
author:     "Janshair Khan"
color: "#D62783"
---

## A common problem!

Before diving into what Consul is and how it can help to resolve most common day-to-day development problems, let's discuss first what we consider as a hassle when developing our applications.

Usually we have applications which very likely to communicate with other applications or services in order to function properly. That services could be a Redis-Cache, a Relational\NoSQL database, logging service or it could be a application serving via HTTP APIs to a front-end application. Connecting these services with each other using hard-coded configurations files is a tedious approach. Also we don't have a way to health check the target service that whether it is running or not. What if we need to frequently change those hard-coded configuration files? What if 1 out of 3 services went down and how would you prevent your load-balancer instance to stop sending requests to that unhealthy service? This is where a service discovery tool like **<a href="https://www.consul.io/" class="underline" target="_blank">Consul</a>** comes to the rescue.

## What do we mean by Service Discovery & What is Consul anyway?

To understand what service discovery is, let's take an analogy. Lets say you contacted one of your friend via his phone number, he receives the call and you **discover** that it is him who you want to talk. If another person picks up the phone on the same phone number, you will immediately throw an exception by changing your mind because that's not him you want to talk. So we can say that:

- The phone is acting like a gateway between you and your friend
- You know that this is your friend's phone number because you know that this is his phone number
- If somehow the call between you and your friend cannot be established, we can say that your friend may not in the talking mood or condition

Take the same analogy with applications that:
- We use a *Service Discovery* tool to act as a gateway between services or applications
- Services register themselves with the Service Discovery tool so other services on the network can discover them
- Service Discovery tool is responsible to make sure that every service inside the network is healthy by making service health checks

Another good example of service discovery can be a DNS. If we hit a DNS entry in our web browser or DNS lookup, the DNS is resolved by an IP address of the target server to whom we want to reach.

**Consul** is one of the popular and open-source service discovery tool. Due to it's high availability, light-weight & fast nature, it has a huge online community and contributors. Other service discovery tools are <a href="https://coredns.io/" class="underline" target="_blank">CoreDNS</a> & <a href="https://github.com/Netflix/eureka" class="underline" target="_blank">Netflix Eureka</a>.

There are many aspects of Consul such as *Service Discovery*, *running Consul in a HA cluster*, *service registration* and others. Here we will see a basic example of *Consul's Key-Value Store* which is a Consul's feature used primarily for storing application configurations. I'll be using a simple Go application which reads application configurations from a `config.json`. Below is the graphical explanation of what we will go through in this post:

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.azureedge.net/misc/dynamic-app-conf-with-consul-and-consul-template/1.png" alt="consul-template-1" class="img-responsive center-block"/>
{% endif %}

The configurations in this `config.json` file are hard-coded where as we want to utilize Consul's KV store to avoid hard-coding configurations in the file so we don't have to change the file each time if any modification is needed in application settings. Those file updates should be done by the Consul tool. You can replace any file instead of this JSON file as the procedure works the same for all files. The application configuration only contains 2 json objects i.e. `version` and `appname` that the golang application will ready. Let's go through it.

Start cloning <a href="https://www.consul.io/intro/getting-started/install.html" class="underline" target="_blank">this</a> repository to find the app source code and follow <a href="https://github.com/hashicorp/consul-template" class="underline" target="_blank">instructions</a> guide to install `consul` & `consul-template` on your system and configure your `PATH` environment variable against `consul` and `consul-template` as well. The installation contains simple Go binaries which is super easy to install, configure and follow.

## Running `consul` and `consul-template`

After installing `consul` and `consul-template`, first run Consul agent server in Dev mode by running the command:

```bash
consul agent -dev -client=0.0.0.0
```

This will spin up a single node Consul cluster in development mode which is a nice way for playing with Consul in development. The `-dev` flag specifies that the `consul` should be running in development mode and `-client=0.0.0.0` flag specifies to advertise the client address to all IP addresses so we can also use Consul Web UI remotely. By default, it advertises on the system's loopback interface.

Go to `http://<your-server-ip>:8500/ui` to access the Consul Web UI. Web UI is a nice interface to a Consul cluster which we can examine and modify values of different services and configurations in a nice graphical way instead of Consul's DNS or HTTP interface.

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.azureedge.net/misc/dynamic-app-conf-with-consul-and-consul-template/2.png" alt="consul-template-1" class="img-responsive center-block"/>
{% endif %}

Next, go to **KEY\VALUE** tab.

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.azureedge.net/misc/dynamic-app-conf-with-consul-and-consul-template/3.png" alt="consul-template-1" class="img-responsive center-block"/>
{% endif %}

Now before adding anything here in the KV store, let's configure and start the `consul-template` on the system as the daemon process.

`consul-template` needs a configuration file where we will tell `consul-template` the template file (with the name `config.tpl`) with the source and name of the file as the destination file. `consul-template` will read that configuration and *will convert the template file by the adding values referenced in template file from the Consul's Key-Value store and will generate the JSON configuration file `config.json` for the application on the fly.* 

Since `consul-template` should already be available on the `PATH` environment variable when installing `consul-template`, let's create a `systemd` unit file to enable `consul-template` to run as the daemon process in the background.


Create a `systemd` unit definition file as:

```bash
vim /etc/systemd/system/consul-template.service
```

And put the below content in the unit definition file:

```toml
[Unit]
Description=consul-template
Requires=network-online.target
After=network-online.target consul.service vault.service

[Service]
EnvironmentFile=-/etc/sysconfig/consul-template
Restart=on-failure
ExecStart=/usr/local/bin/consul-template $OPTIONS -config=/etc/consul/consul-template.hcl

[Install]
WantedBy=multi-user.target
```

Save the file and exit. Now before starting the `consul-template` daemon process, create a `consul-template` HCL configuration file using the command:

```bash
vim /etc/consul/consul-template.hcl
```

And put the below content in the file:

```hcl
template {                                                           
  source = "<path>/config.tpl"           
  destination = "<path>/config.json"
  
  # Command to restart service that's needed upon updating configurations
  command = ""                                                       
}                                                                    
``` 

Upon providing correct source and destination file paths, start or enable the `consul-template` daemon process as:

```bash
sudo systemctl start consul-template.service
```
```bash
sudo systemctl enable consul-template.service
```

This will start `consul-template` in the background which will listen from Consul dev server's KV store and will convert the `config.tpl` file to `config.json` if it detects any change in the KV store.

Next go to *Consul Web UI => KEY\VALUE* and add the following keys and values in the store:

`app/config/version = 1.1`

`app/config/appname = golang`

{% if jekyll.environment == "production" %}
<img src="https://kjanshair.azureedge.net/misc/dynamic-app-conf-with-consul-and-consul-template/4.png" alt="consul-template-1" class="img-responsive center-block"/>
{% endif %}

Upon hitting *START\UPDATE*, the `consul-template` will update those keys with their respective keys and values against the Web UI and `consul-template` daemon would be triggered each time we  update values in the  Consul Web UI and changes will be reflected in the `config.json` file. You can either open the file or run the Go application to check the updated values from Consul KV store. You shoud give it a try to modify them yourself by modifying the application configurations in the Consul's key value & see the reflections in action.

## Setting up using `docker-compose`

You can setup the above setup as Docker containers where Consul's official docker image and `docker-compose` is used to make our life easier. <a href="https://github.com/kjanshair/docker-consul-template" class="underline" target="_blank">here</a> is the source code of each file including the `docker-compose` file for spinning the entire Consul stack to see Consul KV store in action.

## Conclusion

We setup here Consul's Key-Value for making application configurations easier. We setup a single node development Consul cluster in this post for demonstration purpose only. Don't repeat the same for production use cases, instead in production, you setup two or more Consul Server agents with a leader to enable high-available and fault-tolerant cluster and one or more Consul Client agents.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
      {% include disqus.html %}
    {% endif %}
{% endif %}