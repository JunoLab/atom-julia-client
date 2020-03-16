/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const juno = require('../lib/julia-client');
const {client} = juno.connection;

module.exports = function() {

  let editor = null;

  const command = (ed, c) => atom.commands.dispatch(atom.views.getView(ed), c);

  const waitsForClient = () => waitsFor(done => client.onceDone(done));

  beforeEach(function() {
    waitsForPromise(() => atom.workspace.open().then(ed => editor = ed));
    // editor = atom.workspace.buildTextEditor()
    return runs(() => editor.setGrammar(atom.grammars.grammarForScopeName('source.julia')));
  });

  it('can evaluate code', function() {
    let spy;
    client.handle({test: (spy = jasmine.createSpy())});
    editor.insertText('Atom.@rpc test()');
    command(editor, 'julia-client:run-block');
    waitsForClient();
    return runs(() => expect(spy).toHaveBeenCalled());
  });

  describe('when an expression is evaluated', function() {

    let results = null;

    beforeEach(function() {
      editor.insertText('2+2');
      return waitsForPromise(() => {
        return juno.runtime.evaluation.eval().then(x => { return results = x; });
      });
    });

    it('retrieves the value of the expression', function() {
      expect(results.length).toBe(1);
      const view = juno.ui.views.render(results[0]);
      return expect(view.innerText).toBe('4');
    });

    return it('displays the result', function() {
      const views = atom.views.getView(editor).querySelectorAll('.result');
      expect(views.length).toBe(1);
      return expect(views[0].innerText).toBe('4');
    });
  });

  return describe('completions', function() {

    const completionsData = () => ({
      editor,
      bufferPosition: editor.getCursors()[0].getBufferPosition(),
      scopeDescriptor: editor.getCursors()[0].getScopeDescriptor(),
      prefix: editor.getText()
    });

    const getSuggestions = function() {
      const completions = require('../lib/runtime/completions');
      return completions.getSuggestions(completionsData());
    };

    return describe('basic module completions', function() {

      let completions = null;

      beforeEach(function() {
        editor.insertText('sin');
        return waitsForPromise(() => getSuggestions().then(cs => completions = cs));
      });

      return it('retrieves completions', function() {
        completions = completions.map(c => c.text);
        expect(completions).toContain('sin');
        expect(completions).toContain('sincos');
        return expect(completions).toContain('sinc');
      });
    });
  });
};
