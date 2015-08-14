'use strict';
var EventEmitter = require('events').EventEmitter;
var Plotly = require('../plotly');

/**
 * @param {object} gd figure Object
 * @param {object} opts option object
 * @param opts.format 'jpeg' | 'png' | 'webp' | 'svg'
 */
function toImage(gd, opts) {

    // first clone the GD so we can operate in a clean environment
    var Snapshot = Plotly.Snapshot;
    var ev = new EventEmitter();

    var clone = Snapshot.clone(gd, {format: 'png'});
    var clonedGd = clone.td;

    // put the cloned div somewhere off screen before attaching to DOM
    clonedGd.style.position = 'absolute';
    clonedGd.style.left = '-5000px';
    document.body.appendChild(clonedGd);

    function wait () {
        var is3d = clonedGd._fullLayout._hasGL3D;
        var delay = is3d ? 500 : 0;

        setTimeout(function () {
            var svg = Plotly.Snapshot.toSVG(clonedGd);

            var canvasContainer = window.document.createElement('div');
            var canvas = window.document.createElement('canvas');

            // window.document.body.appendChild(canvasContainer);
            canvasContainer.appendChild(canvas);

            canvasContainer.id = Plotly.Lib.randstr();
            canvas.id = Plotly.Lib.randstr();

            ev = Plotly.Snapshot.svgToImg({
                format: opts.format,
                width: clonedGd._fullLayout.width,
                height: clonedGd._fullLayout.height,
                canvas: canvas,
                emitter: ev,
                svg: svg
            });

            ev.clean = function() {
                [clonedGd, canvas, canvasContainer].forEach( function (elem) {
                    if (elem) elem.remove();
                });
            };

        }, delay);
    }


    Plotly.plot(clonedGd, clone.data, clone.layout, clone.config)
    // TODO: the following is Plotly.Plots.redrawText but without the waiting.
    // we shouldn't need to do this, but in *occasional* cases we do. Figure
    // out why and take it out.
        .then(function() {

            // doesn't work presently (and not needed) for polar or 3d
            if(clonedGd._fullLayout._hasGL3D ||
               (clonedGd.data && clonedGd.data[0] && clonedGd.data[0].r)) {
                return;
            }
            Plotly.Annotations.drawAll(clonedGd);
            Plotly.Legend.draw(clonedGd, clonedGd._fullLayout.showlegend);
            (clonedGd.calcdata||[]).forEach(function(d){
                if(d[0]&&d[0].t&&d[0].t.cb) d[0].t.cb();
            });
        })
        .then(wait)
        .catch( function (err) {
            ev.emit('error', err);
        });


    return ev;
}

module.exports = toImage;
