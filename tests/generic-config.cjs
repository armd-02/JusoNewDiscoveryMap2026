const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const parse = name => vm.runInNewContext('(' + fs.readFileSync(name, 'utf8') + ')');
const Stub = class {};
const context = vm.createContext({
    window: { navigator: { language: 'ja' } },
    IndoorControl: Stub, Glottologist: Stub, Basic: Stub, PoiStatusCont: Stub,
    OverPassControl: Stub, Maplibre: Stub, GeoCont: Stub, ListTable: Stub,
    PoiCont: Stub, MapFeature3D: Stub, PlaygroundModelFactories: {},
    GoogleSpreadSheet: Stub, HistoricalNewsController: Stub, NewsTicker: Stub,
    ChangeController: Stub, AreaFeatureLinker: Stub, AreaSearchController: Stub,
    ListActionButtons: Stub
});
vm.runInContext(fs.readFileSync('cmapmaker.js', 'utf8') + '\nthis.maker = cMapMaker;', context);
const config = parse('data/config-user.jsonc');
const before = JSON.stringify(config);
context.Conf = structuredClone(config);
context.maker.prepareConfig();
const prepared = context.Conf;
assert.equal(JSON.stringify(config), before);
for (const key of Object.keys(config)) {
    assert.equal(JSON.stringify(prepared[key]), JSON.stringify(config[key]), `${key} is preserved`);
}
assert.equal(prepared.activity.url, config.google.AppScript);
assert.equal(prepared.activity.targetName, config.google.targetName);
assert.equal(prepared.activity.authMode, 'legacy');
for (const name of ['news', 'changes', 'intro', 'siteUpdates', 'areaFeatureLinker',
    'areaSearch', 'discovery', 'listActions', 'feature3d', 'directions']) {
    assert.equal(prepared[name].use, false, `${name} requires opt-in`);
}
const loaded = Object.assign({}, ...[
    'data/config-user.jsonc', 'data/config-system.jsonc', 'data/config-activities.jsonc',
    'data/marker.jsonc', 'data/category-ja.jsonc', 'data/listtable.jsonc', 'data/overpass-system.jsonc'
].map(parse));
assert.equal(JSON.stringify(loaded.listTable), JSON.stringify(config.listTable),
    'column definitions must not replace site list settings');
assert.equal(loaded.listTable.category, 'activity');
assert.equal(loaded.listTable.target, 'activity');
assert.equal(loaded.listTable.allActs, true);
assert.equal(loaded.mapDisplayStatus.use, false);
assert.equal(JSON.stringify(loaded.map.viewCenter), '[135.481683,34.720456]');
assert.equal(JSON.stringify(loaded.map.maxBounds), '[[135.43,34.66],[135.55,34.75]]');
assert.equal(loaded.static.use, true);
assert.equal(loaded.static.osmjsons.length, 4);
for (const source of loaded.static.osmjsons) assert.ok(fs.existsSync(source), source);
assert.equal(parse('manifest.json').gId, 'G-3NQ6QYH14T');
assert.equal(parse('data/glot-custom.jsonc').site_title.ja, '十三新発見マップ2026 by 淀川アートネット');
assert.equal(JSON.stringify(parse('data/listtable.jsonc').list.columns.actFields),
    '["id","title","keyword","memo","category"]');
assert.equal(loaded.activities.JusoNewDiscovery.form.memo.type, 'textarea');
assert.ok(fs.existsSync(loaded.listTable.backgroundImage));
assert.ok(fs.existsSync(loaded.etc.splashUrl));

// Explicit new settings take precedence over the legacy adapter and defaults.
context.Conf = structuredClone(config);
delete context.Conf.activity;
context.Conf.google.AppScript = 'https://script.google.com/macros/s/example/exec';
context.maker.prepareConfig();
assert.equal(context.Conf.activity.url, context.Conf.google.AppScript);
context.Conf.activity = { url: 'https://example.test/activities', authMode: 'basic', targetName: 'custom' };
context.Conf.areaFeatureLinker = { use: true, areaTargets: ['historic'] };
context.Conf.feature3d = { use: true, models: {}, rules: [] };
context.maker.prepareConfig();
assert.equal(context.Conf.activity.url, 'https://example.test/activities');
assert.equal(context.Conf.activity.authMode, 'basic');
assert.equal(context.Conf.activity.targetName, 'custom');
assert.equal(context.Conf.areaFeatureLinker.use, true);
assert.equal(context.Conf.feature3d.use, true);
console.log('PASS: Juso site settings, legacy GAS compatibility, disabled dedicated services, and explicit opt-in');
