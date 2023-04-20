mapboxgl.accessToken = 'pk.eyJ1IjoiY3JpdGljYWxtYXNzIiwiYSI6ImNqaGRocXd5ZDBtY2EzNmxubTdqOTBqZmIifQ.Q7V0ONfxEhAdVNmOVlftPQ';

const mercatorVertexSource = `
attribute vec2 aPos;
uniform mat4 uMatrix;
varying vec2 vTexCoord;

float Extent = 8192.0;

void main() {
    vec4 a = uMatrix * vec4(aPos * Extent, 0, 1);
    gl_Position = vec4(a.rgba);
    vTexCoord = aPos;
}
`
const mercatorFragmentSource = `
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D uTexture;
void main() {
    vec4 color = texture2D(uTexture, vTexCoord);

    gl_FragColor = color;
    //gl_FragColor = vec4(1.0 - color.r, 1.0 - color.g, 1.0 - color.b, 0.33);
}           
// void main() {
//     vec2 cen = vec2(0.5,0.5) - vTexCoord;
//     vec2 mcen = -0.07* log(length(cen))* normalize(cen);
//     gl_FragColor = texture2D(uTexture, vTexCoord-mcen);
//  }
`

const globeVertexSource = `
attribute vec2 aPos;
varying vec2 vTexCoord;

void main() {
    gl_Position = vec4(aPos, 1.0, 1.0);
    vTexCoord = aPos;
}
`

const globeFragmentSource = `
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D uTexture;
void main() {
    vec4 color = texture2D(uTexture, vTexCoord);

    //gl_FragColor = vec4(1.0 - color.r, 1.0 - color.g, 1.0 - color.b, 1);
    //gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);

    gl_FragColor = color;
}
// void main() {
//     vec2 cen = vec2(0.5,0.5) - vTexCoord;
//     vec2 mcen = -0.07* log(length(cen))* normalize(cen);
//     gl_FragColor = texture2D(uTexture, vTexCoord-mcen);
//  }
`

const map = new mapboxgl.Map({
    container: document.getElementById('map'),
    projection: 'globe',
    style: 'mapbox://styles/mapbox/empty-v8',
    center: [145, -16],
    zoom: 2
});

map.on('load', () => {
    map.setFog({});
    map.showTileBoundaries = true;

    let customlayer = new ColoredTextureLayer({
        id: 'test',
        tileJson: {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'
        },
    });
    map.addLayer(customlayer);
});

class ColoredTextureLayer extends mapboxgl.TextureLayer {
    constructor({ id, tileJson }) {
        super({ id, tileJson });

        this.mercatorProgram = {};
        this.globeProgram = {};
    }

    onAdd(map, gl) {
        super.onAdd(map, gl);

        const mercatorVertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(mercatorVertexShader, mercatorVertexSource);
        gl.compileShader(mercatorVertexShader);

        const mercatorFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(mercatorFragmentShader, mercatorFragmentSource);
        gl.compileShader(mercatorFragmentShader);

        this.mercatorProgram = gl.createProgram();
        gl.attachShader(this.mercatorProgram, mercatorVertexShader);
        gl.attachShader(this.mercatorProgram, mercatorFragmentShader);
        gl.linkProgram(this.mercatorProgram);
        gl.validateProgram(this.mercatorProgram);

        this.mercatorProgram.aPos = gl.getAttribLocation(this.mercatorProgram, "aPos");
        this.mercatorProgram.uMatrix = gl.getUniformLocation(this.mercatorProgram, "uMatrix");
        this.mercatorProgram.uTexture = gl.getUniformLocation(this.mercatorProgram, "uTexture");

        const mercatorVertexArray = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

        this.mercatorProgram.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mercatorProgram.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mercatorVertexArray, gl.STATIC_DRAW);

        // Globe webgl program setup
        const globeVertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(globeVertexShader, globeVertexSource);
        gl.compileShader(globeVertexShader);

        const globeFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(globeFragmentShader, globeFragmentSource);
        gl.compileShader(globeFragmentShader);

        this.globeProgram = gl.createProgram();
        gl.attachShader(this.globeProgram, globeVertexShader);
        gl.attachShader(this.globeProgram, globeFragmentShader);
        gl.linkProgram(this.globeProgram);
        gl.validateProgram(this.globeProgram);

        this.globeProgram.aPos = gl.getAttribLocation(this.globeProgram, "aPos");
        this.globeProgram.uMatrix = gl.getUniformLocation(this.globeProgram, "uMatrix");
        this.globeProgram.uTexture = gl.getUniformLocation(this.globeProgram, "uTexture");

        const globeVertexArray = new Float32Array([1, 1, 1, -1, -1, -1, -1, -1, -1, 1, 1, 1]);

        this.globeProgram.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.globeProgram.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, globeVertexArray, gl.STATIC_DRAW);
    }

    render(gl, projectionMatrix, projection, projectionToMercatorMatrix, projectionToMercatorTransition, centerInMercator, pixelsPerMeterRatio) {
        const tiles = this.visibleTiles();
        gl.useProgram(this.mercatorProgram);
        tiles.forEach(tile => {
            if (!tile.texture) return;
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tile.texture.texture);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.mercatorProgram.vertexBuffer);
            gl.enableVertexAttribArray(this.mercatorProgram.a_pos);
            gl.vertexAttribPointer(this.mercatorProgram.aPos, 2, gl.FLOAT, false, 0, 0);

            gl.uniformMatrix4fv(this.mercatorProgram.uMatrix, false, tile.tileID.projMatrix);
            gl.uniform1i(this.mercatorProgram.uTexture, 0);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.depthFunc(gl.LESS);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }
    renderToTile(gl, tileId) {
        gl.useProgram(this.globeProgram);

        const tileKey = calculateKey(0, tileId.z, tileId.z, tileId.x, tileId.y);
        const tile = this.sourceCache.getTileByID(tileKey)

        console.log(tileId);

        if (!tile.texture) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tile.texture.texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.globeProgram.vertexBuffer);
        gl.enableVertexAttribArray(this.globeProgram.a_pos);
        gl.vertexAttribPointer(this.globeProgram.aPos, 2, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(this.globeProgram.uMatrix, false, tile.tileID.projMatrix);
        gl.uniform1i(this.globeProgram.uTexture, 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthFunc(gl.LESS);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    shouldRerenderTiles() {
        return true;
    }
}

// Ripped from https://github.com/mapbox/mapbox-gl-js/blob/main/src/source/tile_id.js
function calculateKey(wrap, overscaledZ, z, x, y) {
    // only use 22 bits for x & y so that the key fits into MAX_SAFE_INTEGER
    const dim = 1 << Math.min(z, 22);
    let xy = dim * (y % dim) + (x % dim);

    // zigzag-encode wrap if we have the room for it
    if (wrap && z < 22) {
        const bitsAvailable = 2 * (22 - z);
        xy += dim * dim * ((wrap < 0 ? -2 * wrap - 1 : 2 * wrap) % (1 << bitsAvailable));
    }

    // encode z into 5 bits (24 max) and overscaledZ into 4 bits (10 max)
    const key = ((xy * 32) + z) * 16 + (overscaledZ - z);
    // assert(key >= 0 && key <= Number.MAX_SAFE_INTEGER);

    return key;
}