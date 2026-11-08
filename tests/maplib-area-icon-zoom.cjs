const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const parse = file => vm.runInNewContext('(' + fs.readFileSync(file, 'utf8') + ')');
const config = parse('data/config-user.jsonc');
const context = vm.createContext({
    Conf: { ...config, osm: parse('data/overpass-custom.jsonc').osm },
    cMapMaker: { getPoiZoom: target => config.poiView.poiZoom[target] }
});
vm.runInContext(fs.readFileSync('lib/maplib.js', 'utf8') + '\nthis.Maplibre = Maplibre;', context);
const renderer = new context.Maplibre();
context.mapLibre = renderer;
const layers = new Map();
renderer.map = {
    getSource: () => undefined,
    addSource() {},
    addLayer(layer) { layers.set(layer.id, layer); },
    setLayerZoomRange(id, minzoom, maxzoom) { Object.assign(layers.get(id), { minzoom, maxzoom }); }
};
renderer.addPolygon({ type: 'FeatureCollection', features: [] }, 'bicycle_rental', 'name', 1);
const icon = layers.get('bicycle_rental-icon');
assert.equal(icon.layout['icon-image'], 'bicycle_rental.png');
assert.equal(icon.minzoom, 16);
for (const zoom of [12, 13, 14, 15, 15.99]) assert.equal(zoom >= icon.minzoom, false);
assert.equal(16 >= icon.minzoom, true);
for (const suffix of ['lines', 'text', 'fills', 'points']) {
    assert.equal(layers.get('bicycle_rental-' + suffix).minzoom, icon.minzoom);
}
console.log('PASS: rental bicycle area icons and other layers start at configured zoom 16');
