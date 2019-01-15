---
layout:     post
title:      "Using Azure CDN for your website images"
date:       2017-04-27 22:19:06
comments: true
author:     "Janshair Khan"
color: "#2975C6"
---

## Azure CDN for your website images

### The Problem!

Images and custom CSS\JS files are a fundamental part of every website. For a better web performance, loading these static contents in browser as quickly as possible is a very important as the browser's strength visiting our site vary from device to device.

Now we have our CSS\JS and image files on our development machine, we use a build system like Grunt\Gulp to minify and concatenate various CSS\JS files and optimized images before delivering it to production and everything works fine.

These minified CSS\JS and images are usually part of our code. Well, that's fine and application works but it usually affects the request latency for our website static contents. What does that mean?

Suppose your application is running in a Docker container or Azure App Service plan in **East Asia** Azure Data Center region, what if a request comes to your website from a region far away from **East Asia**? The user's browser has to process CSS\JS, download images to the DOM and has to travel more to get these static contents to be displayed in the browser! A worst case would be if the user's browser is running on a smart phone device.

This is where we use **Content Delivery Network or CDN** technology.

### Using Azure CDN

Microsoft Azure offers a CDN service where we can put our static contents in one of the Azure Data Center as a storage (or other) service and Azure CDN will spread those static contents across globally available Azure Data Centers (known as **Edge Servers**) with a **Time-to-live or TTL**  for cache expiry in a very short time. Now what is the benefit this service?

If you use Azure CDN for your static contents and a user comes to your website from anywhere around the world, the user's request will be routed to the closest *Azure Data Center* or more appropriately *Edge Server* (known as **Point-of-Presence or POP**) to retrieve static contents quickly in the browser results with a quick response rather than traveling throughout the globe to the Data Center where the contents are hosted (called **origin**).

If a TTL on an Edge Server is expires and a request comes to the website, the DNS will route the request to the origin rather than POP, cache the contents in the Edge Server and display it to the users. If, next time, any user's request comes from a location near the Edge Server, DNS will route the request to that Edge Server as POP.

Here, in this post, we will see how do we use Azure CDN to retrieve our website images from the POP.

> The images that you see on my website are also coming from an Azure CDN service.

### Setting up a Storage Account

To access images via Azure CDN, we first create an Azure Storage Account where we put our images as Blobs. We use Blob type of storage for our images (Not *File Storage*), so:

- Go to *Azure Portal* => *New* => *Storage* => *Create a Storage Account*

<img src="https://kjanshairio.azureedge.net/azure/2017-04-27-Using-Azure-CDN-for-your-website-images/1.png" alt="'Setting up Azure Storage Account'" class="img-responsive center-block">

- Open the Storage Account in the *Microsoft Azure Storage Explorer* which you can get for free on Win\Mac\Linux to upload your images to Azure Blob storage or you can use Azure Portal too.
-  Upload your images there.

<img src="https://kjanshairio.azureedge.net/azure/2017-04-27-Using-Azure-CDN-for-your-website-images/2.png" alt="'Setting up Azure Storage Account'" class="img-responsive center-block">

-  Change the Account Access policy to *Container* or use a SAS (Storage Access Signature) to access individual images via a unique URI within a specific time period and from a network. I will change the Access Policy to *Container* in order to get every image (or more appropriately called an **Asset**) via a unique URI here for this demo.

<img src="https://kjanshairio.azureedge.net/azure/2017-04-27-Using-Azure-CDN-for-your-website-images/3.png" alt="'Setting up Azure Storage Account'" class="img-responsive center-block">

> If you don't know how to create a Storage Account, learn more about creating your Azure Storage Account [here](https://docs.microsoft.com/en-us/azure/storage/storage-create-storage-account).

### Setting up Azure CDN

When the storage account is ready. Next, we need to provision Azure CDN Profile. For this, go to:

- *Azure Portal* = > *New* => *Web + Mobile*  => *CDN*
- Give it a name, resource group, a Pricing Tier and hit *Create*

<img src="https://kjanshairio.azureedge.net/azure/2017-04-27-Using-Azure-CDN-for-your-website-images/4.png" alt="'Setting up Azure Storage Account'" class="img-responsive center-block">

There are 3 pricing tier available that you can choose from: **Standard Akamai**, **Standard Verizon** and **Premium Verizon**. You can read full details about Azure CDN Pricing tiers [here](https://azure.microsoft.com/en-us/pricing/details/cdn/).

After a few seconds, your CDN service will be ready and a different DNS name will be assigned to your Azure DNS Profile. Next we need to setup a **CDN Endpoint** *which points to the Blob Storage Account where our images are stored*. To do this, go to:

- *Azure DNS Overview* => *Add Endpoint*
- Type a name and select *Origin Type* as *Storage* from the drop down.
- Select the Blob Storage Account where images are hosted and click **Add**.

<img src="https://kjanshairio.azureedge.net/azure/2017-04-27-Using-Azure-CDN-for-your-website-images/5.png" alt="'Setting up Azure Storage Account'" class="img-responsive center-block">

### Accessing your assets

When your endpoint is added, you can now access your individual assets via a unique URI pattern with the DNS of your Azure CDN profile. For example, I have used the following URI pattern for my site:

`https://[DNS-Endpoint]/[Blob-Container]/[Blog-Date-Blog-Title]/[file-name]`
or try this in your browser:
`https://kjanshairio.azureedge.net/azure/2017-04-27-Using-Azure-CDN-for-your-website-images/1.png`

Now you can refer those images in production as CDN for your website. These assets might take about 1-2 hours to spread all of your assets across the globally available edge locations.

## Other Azure CDN Endpoint Options

There are other Azure CDN Endpoint options that you can choose from based upon your business use case, such as using Azure CDN with an *Azure App Service Plan* which can optimize your local static contents with Azure CDN and is fully supported with Visual Studio. You can click [here](https://docs.microsoft.com/en-us/azure/app-service-web/cdn-websites-with-cdn) to learn about integrating Azure CDN with an ASP.NET MVC application.

Also you can use your own **Custom Origin** for your assets if you don't want it to be the part of Azure services such as in an Azure Storage Account. You can learn more about using Azure CDN with custom origin options for Azure CDN [here](https://docs.microsoft.com/en-us/azure/cdn/cdn-create-new-endpoint).

{% if page.comments %}
    {% include disqus.html %}
{% endif %}