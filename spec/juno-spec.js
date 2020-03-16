/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const juno = require('../lib/julia-client');
const {client} = juno.connection;

if (process.platform === 'darwin') {
  process.env.PATH += ':/usr/local/bin';
}

const basicSetup = function() {
  jasmine.attachToDOM(atom.views.getView(atom.workspace));
  waitsForPromise(() => atom.packages.activatePackage('language-julia'));
  waitsForPromise(() => atom.packages.activatePackage('ink'));
  waitsForPromise(() => atom.packages.activatePackage('julia-client'));
  return runs(() => atom.config.set('julia-client', {
    juliaPath: 'julia',
    juliaOptions: {
      bootMode: 'Basic',
      optimisationLevel: 2,
      deprecationWarnings: false
    },
    consoleOptions: {
      rendererType: true
    }
  }
  ));
};

const cyclerSetup = function() {
  basicSetup();
  return runs(() => atom.config.set('julia-client.juliaOptions.bootMode', 'Cycler'));
};

let conn = null;

const withClient = () => beforeEach(function() {
  if (conn != null) {
    return client.attach(conn);
  }
});

const testClient = require('./client');
const testEval = require('./eval');

describe("managing a basic client", function() {
  beforeEach(basicSetup);
  return testClient();
});

describe("interaction with client cycler", function() {
  beforeEach(cyclerSetup);
  return testClient();
});

describe("before use", function() {
  beforeEach(basicSetup);
  return it('boots the client', function() {
    waitsFor(5*60*1000, done => juno.connection.boot().then(() => done()));
    return runs(() => conn = client.conn);
  });
});

describe("in an editor", function() {
  beforeEach(basicSetup);
  withClient();
  return testEval();
});

describe("after use", function() {
  beforeEach(basicSetup);
  withClient();
  return it("kills the client", () => client.kill());
});
