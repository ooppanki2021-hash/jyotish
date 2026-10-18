'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const J = require('../js/jyotish.js');
const Daily = require('../js/daily.js');
const fixture = require('./fixtures/lahiri-reference.json').cases[2];
const NOW = Date.parse('2026-10-18T09:00:00Z');

function appHarness(daily = Daily) {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [NOW])); }
    static now() { return NOW; }
  }
  const elements = {};
  const element = (id, value = '') => (elements[id] = { value, innerHTML: '' });
  ['p-cards', 'p-changes', 'p-expl-personal'].forEach(id => element(id));
  element('cal-chart', '0');
  element('m-tz', '3'); element('m-lat', '55.75'); element('m-lon', '37.62');
  // Both the calendar selector and the unsubmitted form intentionally contain
  // data different from the chart being viewed.
  element('f-date', '2010-01-01'); element('f-time', '12:00');
  element('f-lat', '55.75'); element('f-lon', '37.62'); element('f-tz', '3');
  const records = [{ date: '2010-01-01', time: '12:00', tz: 3 }];
  const context = {
    Date: FixedDate, Jyotish: J, Daily: daily, console,
    document: { getElementById: id => elements[id] || null, addEventListener() {} },
    localStorage: { getItem: () => JSON.stringify(records) },
    setTimeout() {}, clearTimeout() {}
  };
  context.window = context;
  // Test-only access to existing private functions; no test hook is shipped
  // in the production bundle and DOMContentLoaded is not triggered.
  const source = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');
  const suffix = /\}\)\(\);\s*$/;
  assert.ok(suffix.test(source));
  const instrumented = source.replace(suffix, `
    globalThis.appTest = { state: state, renderPeriods: renderPeriods,
      aspectSpans: aspectSpans, signStay: signStay, renderPlanRest: renderPlanRest,
      disablePlan: function(){ renderPlan = function(){}; } };
  })();`);
  vm.runInNewContext(instrumented, context, { filename: 'app.js' });
  context.appTest.disablePlan();
  return { app: context.appTest, elements };
}

test('period cards use one chart UTC even if calendar and form point elsewhere', () => {
  const { app } = appHarness();
  const chart = J.computeChart(fixture.params);
  app.state.chart = chart;
  app.renderPeriods();
  const expected = Daily.dashaAt(Daily.buildDashaTree(chart.planets.Moon.sidLon, +chart.utc), NOW);
  assert.ok(expected);
  const actual = app.state.dashaCur.cur;
  assert.equal(actual.md.planet, expected.md.planet);
  assert.equal(actual.md.start, expected.md.start);
  assert.equal(actual.ad.planet, expected.ad.planet);
  assert.equal(actual.ad.end, expected.ad.end);
  assert.equal(actual.pd.planet, expected.pd.planet);
  const b = app.state.dashaCur.birth;
  assert.equal(Date.UTC(b.by, b.bm - 1, b.bd, b.bhh, b.bmm) - b.btz * 3600000, +chart.utc);
});

test('the transit aspect search finds a known constructed conjunction', () => {
  const { app } = appHarness();
  const exact = Date.parse('2027-04-04T12:00:00Z');
  const sunLongitude = Daily.positions(exact).Saturn;
  const chart = { planets: { Sun: { sidLon: sunLongitude, signIdx: Math.floor(sunLongitude / 30) } } };
  const spans = app.aspectSpans('Saturn', chart, exact - 40 * 86400000, exact + 40 * 86400000);
  const conjunction = spans.find(s => s.n === 'Sun' && s.aspect === 'соединение');
  assert.ok(conjunction, 'a missing transit longitude must not silently turn all aspects into NaN');
  assert.ok(Math.abs(conjunction.exact - exact) <= 86400000);
  assert.ok(conjunction.start < exact && conjunction.end > exact);
});

test('sign-stay boundaries are refined rather than rounded to the scan day', () => {
  const { app } = appHarness();
  const stay = app.signStay('Jupiter', NOW);
  assert.ok(stay.enter < NOW && stay.exit > NOW && stay.reenter > stay.exit);
  const sign = ms => J.transits(new Date(ms)).Jupiter.signIdx;
  const currentSign = sign(NOW), minute = 60000;
  assert.notEqual(sign(stay.enter - minute), currentSign);
  assert.equal(sign(stay.enter + minute), currentSign);
  assert.equal(sign(stay.exit - minute), currentSign);
  assert.notEqual(sign(stay.exit + minute), currentSign);
  assert.notEqual(sign(stay.reenter - minute), currentSign);
  assert.equal(sign(stay.reenter + minute), currentSign);
});


test('monthly plan keeps birth coordinates separate from current residence', () => {
  let parameters;
  const daily = { ...Daily, compute(p) { parameters = p; return { days: [] }; } };
  const { app, elements } = appHarness(daily);
  const chart = J.computeChart(fixture.params);
  app.state.chart = chart;
  app.renderPeriods();
  app.state.dashaCur.lat = 13.75;
  app.state.dashaCur.lon = 100.5;
  elements['p-plan'] = { innerHTML: '' };
  app.renderPlanRest(chart, app.state.dashaCur, '');
  assert.equal(parameters.blat, chart.lat);
  assert.equal(parameters.blon, chart.lon);
  assert.equal(parameters.lat, 13.75);
  assert.equal(parameters.lon, 100.5);
});
