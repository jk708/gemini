'use strict';

var fs = require('fs'),
    path = require('path'),
    temp = require('temp'),
    Image = require('../../lib/image');

function imagePath(name) {
    return path.join(__dirname, 'data', 'image', name);
}

function withTempFile(func) {
    var filePath = temp.path({suffix: '.png'});
    return func(filePath).fin(function() {
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
        }
    });
}

describe('image', function() {
    describe('compare', function() {
        it('should resolve to `true` for equal images', function() {
            return Image.compare(imagePath('image1.png'), imagePath('image2.png'))
                .then(function(result) {
                    result.must.be.true();
                });
        });

        it('should resolve to `false` for non-equal images', function() {
            return Image.compare(imagePath('image1.png'), imagePath('image3.png'))
                .then(function(result) {
                    result.must.be.false();
                });
        });

        it('should resolve to `true` for images with unnoticable difference', function() {
            return Image.compare(
                    imagePath('image1.png'),
                    imagePath('image4.png')
                )
                .then(function(result) {
                    result.must.be(true);
                });
        });

        it('should resolve to `false` for images with unnoticable difference if strictComparison=true', function() {
            return Image.compare(
                    imagePath('image1.png'),
                    imagePath('image4.png'),
                    {strictComparison: true}
                )
                .then(function(result) {
                    result.must.be(false);
                });
        });
    });

    describe('buildDiff', function() {
        it('should build diff image', function() {
            return withTempFile(function(fileName) {
                var opts = {
                    reference: imagePath('image1.png'),
                    current: imagePath('image3.png'),
                    diff: fileName,
                    diffColor: '#f0001c'
                };
                return Image.buildDiff(opts)
                    .then(function() {
                        return Image.compare(imagePath('image_diff.png'), fileName);
                    })
                    .then(function(equal) {
                        equal.must.be.true();
                    });
            });
        });

        it('should allow to change diff color', function() {
            return withTempFile(function(fileName) {
                var opts = {
                    reference: imagePath('image1.png'),
                    current: imagePath('image3.png'),
                    diff: fileName,
                    diffColor: '#0000ff'
                };
                return Image.buildDiff(opts)
                    .then(function() {
                        return Image.compare(imagePath('image_diff_blue.png'), fileName);
                    })
                    .then(function(equal) {
                        equal.must.be.true();
                    });
            });
        });
    });

    describe('instance', function() {
        beforeEach(function() {
            var imageBuf = fs.readFileSync(imagePath('image1.png'));
            this.image = new Image(imageBuf);
        });

        it('should return correct size', function() {
            return this.image.getSize().then(function(size) {
                size.width.must.equal(20);
                size.height.must.equal(20);
            });
        });

        it('should save the image', function() {
            var _this = this;
            return withTempFile(function(filePath) {
                return _this.image.save(filePath)
                    .then(function() {
                        return Image.compare(imagePath('image1.png'), filePath);
                    })
                    .then(function(equal) {
                        equal.must.be.true();
                    });
            });
        });

        it('should crop image', function() {
            var _this = this;
            return withTempFile(function(filePath) {
                return _this.image.crop({top: 1, left:1, width: 18, height: 18})
                    .then(function(image) {
                        return image.save(filePath);
                    })
                    .then(function() {
                        return Image.compare(imagePath('image1_cropped.png'), filePath);
                    })
                    .then(function(equal) {
                        equal.must.be.true();
                    });
            });
        });
    });
});
