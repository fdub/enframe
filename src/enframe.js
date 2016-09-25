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
        width = width || container.clientWidth;
        height = height || container.clientHeight;

        var left = frame.padding.left / frame.outer.width * 100;
        var top = frame.padding.top / frame.outer.height * 100;
        var right = frame.padding.right / frame.outer.width * 100;
        var bottom = frame.padding.bottom / frame.outer.height * 100;

        container.style.width = width + 'px';
        container.style.height = height + 'px';

        var image = container.querySelector('.nf-image');   
        image.style.left = left + '%';
        image.style.top = top + '%';
        image.style.width = 100 - right - left + '%';
        image.style.height = 100 - top - bottom + '%';

        var shadow = container.querySelector('.nf-shadow');
        shadow.style.left = left + '%';
        shadow.style.top = top + '%';
        shadow.style.width = 100 - right - left + '%';
        shadow.style.height = 100 - top - bottom + '%';
    }

    function selectFrame(ratio) {
        ratio += Math.random() * 0.1 - 0.05;
        return frames.sort(function(a, b) {
                return Math.abs(a.inner.ratio - ratio) - Math.abs(b.inner.ratio - ratio);
            })[0];
    }

    function wrap(img) {
        var container = document.createElement('div');
        img.parentNode.insertBefore(container, img);
        container.appendChild(img);
        return container;
    }

    function addClass(el, className) {
        if (el.classList !== undefined){
            el.classList.add(className);
        } else {
            el.className += ' ' + className;
        }
    }
    function appendDiv(target, className) {
        var div = document.createElement('div');
        addClass(div, className);
        target.insertBefore(div, undefined);
        return div;
    }
    function is(node, selector) {
        var nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;
        while (nodes[++i] && nodes[i] != node);
        return !!nodes[i];
    }

    me.wrapOne = function(img, callback) {
        var src = img.getAttribute('src') || img.querySelector('img').getAttribute('src');
        var frame = selectFrame(img.clientWidth / img.clientHeight);
        
        var width = img.clientWidth;
        var innerWidth = width * frame.inner.width / frame.outer.width;
        var innerHeight = innerWidth * img.clientHeight / img.clientWidth;
        var height = innerHeight * frame.outer.height / frame.inner.height;
        
        var container = wrap(img);
        var imageNode1 = appendDiv(container, 'nf-image');
        var imageNode2 = appendDiv(container, 'nf-image');
        var shadowNode = appendDiv(container, 'nf-shadow');
        
        addClass(container, 'nf-container');

        imageNode1.style.backgroundImage = 'url(' + src + ')';
        imageNode2.style.backgroundImage = 'url(' + frame.img.src + ')';

        setContainerSize(container, frame, width, height);


        if (is(img, 'img')) {
            img.remove();
        } else {
            img.querySelector('img').remove();
            shadowNode.appendChild(img);
        }

        var show = function() {
            addClass(container, 'nf-visible');
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