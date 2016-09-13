/// <reference path="../typings/index.d.ts"/>

require.config({
    paths: {
        jquery: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.0/jquery', 
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

        function setInitialFrameSizeIfAvailable(frame) {
            framesLoading--;
            
            if (frame.img.height === 0 || frame.img.width === 0) {
                frame.retries--;
                if (frame.retries > 0) {
                    subscribeInitialFrameSizeCheck(frame);
                } else {
                    throw 'Image could not be loaded.';
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

        function subscribeInitialFrameSizeCheck(frame) {
            framesLoading++;

            frame.initSubscription.setDisposable(
                Rx.Observable
                    .of(frame)
                    .delay(20 * (6 - frame.retries) * (6 - frame.retries))
                    .subscribe(setInitialFrameSizeIfAvailable));
        }

        function initFrame(frame, frameUrl) {
            var frameUrlSplit = frameUrl.split('_');
            
            frame.img.src = frameUrl;
            frame.inner = {
                width: parseInt(frameUrlSplit[1]),
                height: parseInt(frameUrlSplit[2]),
                ratio: parseInt(frameUrlSplit[1]) / parseInt(frameUrlSplit[2])
            };
            frame.retries = 5;
            frame.padding = {
                top: parseInt(frameUrlSplit[3]),
                right: parseInt(frameUrlSplit[4]),
                bottom: parseInt(frameUrlSplit[5]),
                left: parseInt(frameUrlSplit[6])                
            };
            frame.initSubscription = new Rx.SerialDisposable();

            subscribeInitialFrameSizeCheck(frame);
        }

        $(framesSelector).each(function(_, el) {
            var frameUrl = el.src;

            initFrame({ img: new Image() }, frameUrl);
        });
    };

    function setContainerSize(container, frame, width, height) {
        var $container = $(container);
        width = width || $container.width();
        height = height || $container.height();
        
        var imgWidth = frame.inner.width / frame.outer.width * width;
        var imgHeight = frame.inner.height / frame.outer.height * height;
        var $div = $container.children().first();

        $container
            .addClass('enframe-container')
            .css('width', width)
            .css('height', height)
            .css('background-size', width + 'px ' + height + 'px');
        $div
            .css('width', imgWidth + 'px')
            .css('height', imgHeight + 'px')
            .css('background-size', imgWidth + 'px' + ' ' + imgHeight + 'px')
            .css('margin-left', frame.padding.left / frame.outer.width * width + 'px')
            .css('margin-top', frame.padding.top / frame.outer.height * height + 'px');
        
    }

    function selectFrame(ratio) {
        return frames.sort(function(a, b) {
                return Math.abs(a.inner.ratio - ratio) - Math.abs(b.inner.ratio - ratio);
            })[0];
    }

    me.wrap = function(selector) {
        $(selector).each(function(_, img) {
            var src = img.src;
            var frame = selectFrame(img.width / img.height);
            
            var width = img.width;
            var height = frame.outer.height / frame.outer.width * width; 
            
            var $div = $(img).wrap('<div></div>').parent();
            var $container = $($div).wrap('<div></div>').parent();

            $container.css('background-image', 'url(' + frame.img.src + ')');
            $div.css('background-image', 'url(' + src + ')');

            setContainerSize($container[0], frame, width, height);
            
            $div.children().remove();
            $container.animate({opacity: '1'}, 200);
            
            $container.resize(function() {
                setContainerSize($container[0], frame);
            });
        });
    };    
    return me;
});