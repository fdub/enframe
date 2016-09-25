/// <reference path="../typings/index.d.ts"/>

define('enframe', ['require', 'jquery'], function(require) {
    $ = require('jquery');
    var emptyCallback = function() { };
    var me = {};
    var frames = [];

    me.init = function(framesSelector) {
        var initFrame;
        var scheduleInit;
        var finishOrRetryInit;

        initFrame = function(frame, frameUrl) {
            var frameUrlSplit = frameUrl.split('_');
            
            frame.img.src = frameUrl;
            frame.retries = 5;
            
            frame.outer = {
                width: parseInt(frameUrlSplit[1]),
                height: parseInt(frameUrlSplit[2]),
            };
            
            frame.padding = {
                top: parseInt(frameUrlSplit[3]),
                right: parseInt(frameUrlSplit[4]),
                bottom: parseInt(frameUrlSplit[5]),
                left: parseInt(frameUrlSplit[6])                
            };

            frame.inner = {
                width: frame.outer.width - frame.padding.left - frame.padding.right,
                height: frame.outer.height - frame.padding.top - frame.padding.bottom
            };
            frame.inner.ratio = frame.inner.width / frame.inner.height;

            frame.isInitialized = false;
            frame.onInitalized = [];

            scheduleInit(frame);
            return frame;
        };

        scheduleInit = function(frame) {
            window.setTimeout(function() { finishOrRetryInit(frame); }, 20 * (6 - frame.retries) * (6 - frame.retries));
        };

        finishOrRetryInit = function(frame) {
            if (frame.img.height === 0 || frame.img.width === 0) {
                frame.retries--;
                if (frame.retries > 0) {
                    scheduleInit(frame);
                } else {
                    throw 'Image could not be loaded.';
                }
            } else {
                frame.isInitialized = true;

                $(frame.onInitalized).each(function(_, fn) {
                    fn();
                });
                frame.onInitalized = [];
            }
        };
        
        $(framesSelector).each(function(_, el) {
            var frameUrl = el.src;

            var frame = initFrame({ img: new Image() }, frameUrl);
            
            frames.push(frame);   
        });
    };

    function setContainerSize(container, frame, width, height) {
        var $container = $(container);
        width = width || $container.width();
        height = height || $container.height();

        var left = frame.padding.left / frame.outer.width * 100;
        var top = frame.padding.top / frame.outer.height * 100;
        var right = frame.padding.right / frame.outer.width * 100;
        var bottom = frame.padding.bottom / frame.outer.height * 100;

        $container
            .css('width', width)
            .css('height', height);

        $container.find('.nf-image').first()
            .css('left', left + '%')
            .css('top', top + '%')
            .css('width', 100 - right - left + '%')
            .css('height', 100 - top - bottom + '%');

        $container.find('.nf-shadow')
            .css('left', left + '%')
            .css('top', top + '%')
            .css('width', 100 - right - left + '%')
            .css('height', 100 - top - bottom + '%');
    }

    function selectFrame(ratio) {
        ratio += Math.random() * 0.1 - 0.05;
        return frames.sort(function(a, b) {
                return Math.abs(a.inner.ratio - ratio) - Math.abs(b.inner.ratio - ratio);
            })[0];
    }

    me.wrapOne = function(img, callback) {
        var src = img.getAttribute('src') || img.querySelector('img').getAttribute('src');
        var frame = selectFrame(img.clientWidth / img.clientHeight);
        
        var width = img.clientWidth;
        var innerWidth = width * frame.inner.width / frame.outer.width;
        var innerHeight = innerWidth * img.clientHeight / img.clientWidth;
        var height = innerHeight * frame.outer.height / frame.inner.height;
        
        var $container = $(img)
            .wrap('<div></div>')
            .parent()
            .append('<div class="nf-image"></div>')
            .append('<div class="nf-image"></div>')
            .append('<div class="nf-shadow"></div>')
            .addClass('nf-container');

        $container.find('.nf-image').first().css('background-image', 'url(' + src + ')');
        $container.find('.nf-image').last().css('background-image', 'url(' + frame.img.src + ')');

        setContainerSize($container[0], frame, width, height);
        
        if ($container.find(img).is('img')) {
            $container.find(img).remove();
        } else {
            $container.find(img).find('img').remove();
            $container.find(img).detach().appendTo($container.find('.nf-shadow'));
        }

        var show = function() {
            $container.addClass('nf-visible');
            (callback || emptyCallback)();
        };
        if (frame.isInitialized) {
            show();
        } else {
            frame.onInitalized.push(show);
        }
    };

    me.wrap = function(selector, callback) {
        var imgCounter = 0; 
        $(selector).each(function(_, img) {
            imgCounter++;
            me.wrapOne(img, function() {
                imgCounter--;
                if (imgCounter === 0) {
                    (callback || emptyCallback)();
                }
            });
        });
    };    
    return me;
});