(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.mapboxgl = global.mapboxgl || {}));
}(this, (function (exports) { 'use strict';

    class TextureLayer {
        constructor({id, tileJson}) {
            this.map = null;
            this.gl = null;
            this.id = id;
            this.tileSource = null;
            this.source = this.id + 'Source';
            this.type = 'custom';
            this.tileJson = tileJson;
            this.program = null;
        }
        onAdd(map, gl) {
            this.map = map;
            this.gl = gl;
            map.on('move', this.move.bind(this));
            map.on('zoom', this.zoom.bind(this));

            map.addSource(this.source, this.tileJson);

            this.tileSource = this.map.getSource(this.source);
            this.tileSource.on('data', this.onData.bind(this));
            this.sourceCache = this.map.style._sourceCaches['other:' + this.source];

            // !IMPORTANT! hack to make mapbox mark the sourceCache as 'used' so it will initialise tiles.
            this.map.style._layers[this.id].source = this.source;
        }
        move(e) {
            this.updateTiles();
        }
        zoom(e) {

        }
        onData(e) {
            if (e.sourceDataType == 'content') {
                this.updateTiles();
            } else if (e.tile !== undefined && this.map.isSourceLoaded(this.source)) ;
        }
        visibleTiles() {
            return this.sourceCache.getVisibleCoordinates().map(tileid => this.sourceCache.getTile(tileid));
        }
        updateTiles() {
            this.sourceCache.update(this.map.painter.transform);
        }
        prerender(gl, projectionMatrix, projection, projectionToMercatorMatrix, projectionToMercatorTransition, centerInMercator, pixelsPerMeterRatio) {
        }
        render(gl, projectionMatrix, projection, projectionToMercatorMatrix, projectionToMercatorTransition, centerInMercator, pixelsPerMeterRatio) {
        }
        renderToTile(gl, tileId) {
        }
        shouldRerenderTiles() {
            return false;
        }
    }

    exports.TextureLayer = TextureLayer;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
