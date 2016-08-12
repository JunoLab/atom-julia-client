juno = require '../lib/julia-client'
{client} = juno.connection

module.exports = ->

  editor = null

  command = (ed, c) -> atom.commands.dispatch(atom.views.getView(ed), c)

  waitsForClient = -> waitsFor (done) -> client.onceDone done

  beforeEach ->
    waitsForPromise -> atom.workspace.open().then (ed) -> editor = ed
    runs ->
      editor.setGrammar(atom.grammars.grammarForScopeName('source.julia'))

  it 'can evaluate code', ->
    client.handle test: (spy = jasmine.createSpy())
    editor.insertText 'Atom.@rpc test()'
    command editor, 'julia-client:run-block'
    waitsForClient()
    runs ->
      expect(spy).toHaveBeenCalled()

  describe 'when an expression is evaluated', ->

    results = null

    beforeEach ->
      editor.insertText '2+2'
      waitsForPromise =>
        juno.runtime.evaluation.eval().then (x) => results = x

    it 'retrieves the value of the expression', ->
      expect(results.length).toBe 1
      view = juno.ui.views.render results[0]
      expect(view.innerText).toBe '4'

    it 'displays the result', ->
      views = atom.views.getView(editor).querySelectorAll('.result')
      expect(views.length).toBe 1
      expect(views[0].innerText).toBe '4'

  describe 'completions', ->

    completionsData = ->
      editor: editor
      bufferPosition: editor.getCursors()[0].getBufferPosition()
      scopeDescriptor: editor.getCursors()[0].getScopeDescriptor()

    getSuggestions = -> juno.runtime.completions.getSuggestions completionsData()

    describe 'basic module completions', ->

      completions = null

      beforeEach ->
        editor.insertText 'f'
        waitsForPromise ->
          getSuggestions().then (cs) ->
            completions = cs

      it 'fills the autocomplete cache', ->
        waitsForClient()
        runs ->
          expect(juno.runtime.completions.cache.Main).toBeTruthy()

      it 'retrieves completions', ->
        completions = completions.map (c) -> c.text
        expect(completions).toContain 'fft'
        expect(completions).toContain '@time'
        expect(completions).toContain 'Base'
