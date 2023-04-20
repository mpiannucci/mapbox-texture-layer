mapboxgl.accessToken = 'pk.eyJ1IjoiY3JpdGljYWxtYXNzIiwiYSI6ImNqaGRocXd5ZDBtY2EzNmxubTdqOTBqZmIifQ.Q7V0ONfxEhAdVNmOVlftPQ';

var vertexSource = `
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
var fragmentSource = `
    precision mediump float;
    varying vec2 vTexCoord;
    uniform sampler2D uTexture;
    void main() {
        vec4 color = texture2D(uTexture, vTexCoord);

        gl_FragColor = vec4(1.0 - color.r, 1.0 - color.g, 1.0 - color.b, 1);
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
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [145, -16],
    zoom: 0
});
map.on('load', () => {
    let customlayer = new mapboxgl.TextureLayer({
        id: 'test',
        tileJson: {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'
        },
        onAddCallback: setupLayer,
        renderCallback: render,
        renderToTileCallback: renderToTile
    });
    map.addLayer(customlayer);
});

var program = {};
function setupLayer(map, gl) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.validateProgram(program);

    program.aPos = gl.getAttribLocation(program, "aPos");
    program.uMatrix = gl.getUniformLocation(program, "uMatrix");
    program.uTexture = gl.getUniformLocation(program, "uTexture");

    const vertexArray = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

    program.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
}
function render(gl, matrix, tiles) {
    gl.useProgram(program);
    tiles.forEach(tile => {
        if (!tile.texture) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tile.texture.texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
        gl.enableVertexAttribArray(program.a_pos);
        gl.vertexAttribPointer(program.aPos, 2, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(program.uMatrix, false, tile.tileID.projMatrix);
        gl.uniform1i(program.uTexture, 0);
        gl.depthFunc(gl.LESS);
        //gl.enable(gl.BLEND);
        //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

    });
}
function renderToTile(gl, tileId) {
    gl.useProgram(program);

    const tileKey = calculateKey(0, tileId.z, tileId.z, tileId.x, tileId.y);
    const tile = this.sourceCache.getTileByID(tileKey)

    if (!tile.texture) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tile.texture.texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    gl.enableVertexAttribArray(program.a_pos);
    gl.vertexAttribPointer(program.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(program.uMatrix, false, tile.tileID.projMatrix);
    gl.uniform1i(program.uTexture, 0);
    gl.depthFunc(gl.LESS);
    //gl.enable(gl.BLEND);
    //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
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