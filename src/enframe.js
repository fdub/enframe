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
    var frames = [];
    var isInitalized = false;
    var initFailed = false;

    me.init = function(framesSelector, callback, options) {
        var i;
        var framesLoading = 0;

        function setImageSizeIfAvailable(frame) {
            framesLoading--;
            
            if (frame.img.height === 0 || frame.img.width === 0) {
                frame.retries--;
                if (frame.retries > 0) {
                    subscribeImageSize(frame);
                } else {
                    throw "Image could not be loaded.";
                }
            } else {
                frame.outer = { width: frame.img.width, height: frame.img.height };
                frame.initSubscription.dispose();
                frames.push(frame);   
                if (framesLoading === 0) {
                    callback();
                }
            }
        }
        function subscribeImageSize(frame) {
            framesLoading++;
            
            if(frame.initSubscription !== undefined) {
                frame.initSubscription.dispose();
            }
            frame.initSubscription = Rx.Observable
                .of(frame)
                .delay(20 * (6 - frame.retries) * (6 - frame.retries))
                .subscribe(setImageSizeIfAvailable);
        }
        $(framesSelector).each(function(_, frame) {
            var frameUrl = frame.src;
            var frameUrlSplit = frameUrl.split('_');

            var frame = { img: new Image() };
            frame.img.src = frameUrl;
            frame.inner = {
                width: parseInt(frameUrlSplit[1]),
                height: parseInt(frameUrlSplit[2]) 
            };
            frame.retries = 5;
            frame.padding = {
                top: parseInt(frameUrlSplit[3]),
                right: parseInt(frameUrlSplit[4]),
                bottom: parseInt(frameUrlSplit[5]),
                left: parseInt(frameUrlSplit[6])                
            };
            frame.paddingStyle = function(width, height){
                return "" + 
                    frame.padding.top / frame.outer.height * height + "px " +
                    frame.padding.right / frame.outer.width * width + "px " +
                    frame.padding.bottom / frame.outer.height * height + "px " +
                    frame.padding.left / frame.outer.width * width + "px ";
            };

            subscribeImageSize(frame);
        });
    };

    function copyCssProperty(source, target, propertyName, fallback) {
        var sourceProp = $(source).css(propertyName);
        var targetProp = (sourceProp !== undefined) 
            ? sourceProp
            : fallback;
        $(target).css(propertyName, targetProp);
    } 

    me.wrap = function(selector) {
        $(selector).each(function(_, img) {
            var src = img.src;
            var frame = frames[Math.floor(frames.length * Math.random())];
            var width = img.width;
            var height = frame.outer.height / frame.outer.width * width; 
            var div = $(img).wrap('<div></div>').parent();
            var container = $(div).wrap('<div></div>').parent();
            var imgWidth = frame.inner.width / frame.outer.width * width;
            var imgHeight = frame.inner.height / frame.outer.height * height;

            copyCssProperty(img, container, "width", width);
            copyCssProperty(img, container, "height", height);
            container
                .addClass("enframe-container")
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