'use strict';

var util = require('util'),
    q = require('q'),
    inherit = require('inherit'),
    find = require('../lib/find-func').find,
    StateError = require('../lib/errors/state-error');

module.exports = inherit({
    __constructor: function(browser) {
        this.browser = browser;
        this._context = {};
    },

    get browserId() {
        return this.browser.id;
    },

    runHook: function(hook) {
        var sequence = this.browser.createActionSequence();

        try {
            hook.call(this._context, sequence, find);
        } catch (e) {
            return q.reject(new StateError('Error while executing callback', e));
        }
        return sequence.perform();
    },

    capture: function(state, opts) {
        var _this = this;
        return _this.runHook(state.callback)
            .then(function() {
                return _this.browser.prepareScreenshot(state.captureSelectors, opts);
            })
            .then(function(data) {
                return _this.browser.captureFullscreenImage().then(function(image) {
                    return [image, _this._getCropRect(image, data), data];
                });
            })
            .spread(function(image, cropRect, data) {
                return image.crop(cropRect)
                    .then(function(crop) {
                        return {
                            image: crop,
                            canHaveCaret: data.canHaveCaret,
                            coverage: data.coverage
                        };
                    });
            })
            .fail(function(e) {
                if (e instanceof StateError) {
                    //extend error with metadata
                    e.suiteId = state.suite.id;
                    e.suiteName = state.suite.name;
                    e.stateName = state.name;
                    e.browserId = _this.browserId;
                }
                return q.reject(e);
            });
    },

    _getCropRect: function(image, pageData) {
        return image.getSize()
            .then(function(imageSize) {
                var size = pageData.cropSize,
                    location = pageData.locationInBody;
                if (imageSize.height < pageData.bodyHeight) {
                    location = pageData.locationInViewport;
                }

                if (location.top + size.height > imageSize.height) {
                    return q.reject(new StateError(util.format(
                        'Failed to capture the element because it is positioned outside of the captured body. ' +
                        'Most probably you are trying to capture an absolute positioned element which does not make body ' +
                        'height to expand. To fix this place a tall enough <div> on the page to make body expand.\n' +
                        'Element position: %s, %s; size: %s, %s. Page screenshot size: %s, %s. ',
                        location.left, location.top, size.width, size.height, imageSize.width, imageSize.height)));
                }

                return {
                    top: location.top,
                    left: location.left,
                    width: size.width,
                    height: size.height
                };
            });
    }

});
