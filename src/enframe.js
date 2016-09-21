/// <reference path="../typings/index.d.ts"/>

require.config({
    paths: {
        jquery: '../lib/jquery.min', 
        Rx: '../lib/rx.all.min'
    }
});

define('enframe', ['require', 'Rx', 'jquery'], function(require) {
    Rx = require('Rx');
    $ = require('jquery');
    var me = {};
    var frames = [];
    var isInitalized = false;
    var initFailed = false;

    String.prototype.format = String.prototype.f = function() {
        var s = this,
            i = arguments.length;

        while (i--) {
            s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
        }
        return s;
    };

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
                frame.outer = { 
                    width: frame.img.width,
                    height: frame.img.height 
                };
                frame.inner = {
                    width: frame.outer.width - frame.padding.left - frame.padding.right,
                    height: frame.outer.height - frame.padding.top - frame.padding.bottom
                };
                frame.inner.ratio = frame.inner.width / frame.inner.height;

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
            frame.retries = 5;
            frame.padding = {
                top: parseInt(frameUrlSplit[1]),
                right: parseInt(frameUrlSplit[2]),
                bottom: parseInt(frameUrlSplit[3]),
                left: parseInt(frameUrlSplit[4])                
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

    me.wrap = function(selector) {
        $(selector).each(function(_, img) {
            var src = $(img)[0].src || $(img).find('img')[0].src;
            var frame = selectFrame(img.clientWidth / img.clientHeight);
            
            var imgFactor = img.clientWidth / frame.inner.width; 

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

            $container.animate({opacity: '1'}, 100);
        });
    };    
    return me;
});