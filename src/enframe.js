/// <reference path="../typings/index.d.ts"/>

require.config({
    paths: {
        jquery: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.0/jquery.min', 
        Rx: 'https://cdnjs.cloudflare.com/ajax/libs/rxjs/4.1.0/rx.all.min'
    }
});

define('enframe', ['require', 'Rx', 'jquery'], function(require) {
    Rx = require('Rx');
    $ = require('jquery');
    var me = {};
    var imagePaths = []; 
    var images = [];
    var isInitalized = false;
    var initFailed = false;

    me.init = function(imageUrls, callback, options) {
        if (!Array.isArray(imageUrls)) {
            console.error('Argument imagePaths must contain an array of image urls.');
        }
        this.imagePaths = imageUrls;
        var i;
        var imagesLoading = 0;

        function setImageSizeIfAvailable(image) {
            imagesLoading--;
            
            if (image.img.height === 0 || image.img.width === 0) {
                image.retries--;
                if (image.retries > 0) {
                    subscribeImageSize(image);
                } else {
                    throw "Image could not be loaded.";
                }
            } else {
                image.outer = { width: image.img.width, height: image.img.height };
                image.initSubscription.dispose();
                images.push(image);   
                if (imagesLoading === 0) {
                    callback();
                }
            }
        }
        function subscribeImageSize(image) {
            imagesLoading++;
            
            if(image.initSubscription !== undefined) {
                image.initSubscription.dispose();
            }
            image.initSubscription = Rx.Observable
                .of(image)
                .delay(20 * (6 - image.retries) * (6 - image.retries))
                .subscribe(setImageSizeIfAvailable);
        }
        $(imageUrls).each(function(_, imageUrl) {
            var imageUrlSplit = imageUrl.split('_');

            var image = { img: new Image() };
            image.img.src = imageUrl;
            image.inner = {
                width: parseInt(imageUrlSplit[1]),
                height: parseInt(imageUrlSplit[2]) 
            };
            image.retries = 5;
            image.padding = {
                top: parseInt(imageUrlSplit[3]),
                right: parseInt(imageUrlSplit[4]),
                bottom: parseInt(imageUrlSplit[5]),
                left: parseInt(imageUrlSplit[6])                
            };
            image.paddingStyle = function(width, height){
                return "" + 
                    image.padding.top / image.outer.height * height + "px " +
                    image.padding.right / image.outer.width * width + "px " +
                    image.padding.bottom / image.outer.height * height + "px " +
                    image.padding.left / image.outer.width * width + "px ";
            };

            subscribeImageSize(image);
        });
    };

    me.wrap = function(selector) {
        $(selector).each(function(_, img) {
            var src = img.src;
            var frame = images[Math.floor(images.length * Math.random())];
            var width = img.width;
            var height = frame.outer.height / frame.outer.width * width; 
            var div = $(img).wrap('<div></div>').parent();
            var container = $(div).wrap('<div></div>').parent();
            var imgWidth = frame.inner.width / frame.outer.width * width;
            var imgHeight = frame.inner.height / frame.outer.height * height;
            container
                .addClass("enframe-container")
                .css("width", width + "px")
                .css("height", height + "px")
                .css("background-image", "url(" + frame.img.src + ")")
                .css("background-size", width + "px " + height + "px")
                .css("padding", frame.paddingStyle(width, height));
            div
                .css("width", imgWidth + "px")
                .css("height", imgHeight + "px")
                .css("background-image", "url(" + src + ")")
                .css("background-size", imgWidth + "px " + imgHeight + "px");
            div.children().remove();
            container.animate({opacity: "1"}, 200);
        });
    };    
    return me;
});