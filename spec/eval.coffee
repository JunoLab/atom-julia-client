juno = require '../lib/julia-client'
{client} = juno.connection

module.exports = ->

  editor = null

  command = (ed, c) -> atom.commands.dispatch(atom.views.getView(ed), c)

  waitsForClient = -> waitsFor (done) -> client.onceDone done

  beforeEach ->
    waitsForPromise -> atom.workspace.open().then (ed) -> editor = ed
    # editor = atom.workspace.buildTextEditor()
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
      prefix: editor.getText()

    getSuggestions = ->
      completions = require '../lib/runtime/completions'
      completions.getSuggestions completionsData()

    describe 'basic module completions', ->

      completions = null

      beforeEach ->
        editor.insertText 'sin'
        waitsForPromise ->
          getSuggestions().then (cs) ->
            completions = cs

      it 'retrieves completions', ->
        completions = completions.map (c) -> c.text
        expect(completions).toContain 'sin'
        expect(completions).toContain 'sincos'
        expect(completions).toContain 'sinc'
