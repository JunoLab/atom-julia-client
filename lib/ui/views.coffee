Highlighter = require './highlighter'

{client} = require '../connection'
{once} = require '../misc'

getlazy = client.import 'getlazy'

module.exports = views =
  dom: ({tag, attrs, contents}, opts) ->
    view = document.createElement tag
    for k, v of attrs
      if v instanceof Array then v = v.join ' '
      view.setAttribute k, v
    if contents?
      if contents.constructor isnt Array
        contents = [contents]
      for child in contents
        view.appendChild @render child, opts
    view

  html: ({content}) ->
    view = @render @tags.div()
    view.innerHTML = content
    view = if view.children.length == 1 then view.children[0] else view

  tree: ({head, children, expand}, opts) ->
    @ink.tree.treeView(@render(head, opts),
                       children.map((x)=>@render(@tags.div([x]), opts)),
                       expand: expand)

  lazy: ({head, id}, opts) ->
    conn = client.conn
    if opts.registerLazy?
      opts.registerLazy id
    else
      console.warn 'Unregistered lazy view'
    view = @ink.tree.treeView @render(head, opts), [],
      onToggle: once =>
        return unless client.conn == conn
        getlazy(id).then (children) =>
          body = view.querySelector ':scope > .body'
          children.map((x) => @render(@tags.div([x]), opts)).forEach (x) ->
            body.appendChild x

  subtree: ({label, child}, opts) ->
    @render (if child.type == "tree"
      type: "tree"
      head: @tags.span [label, child.head]
      children: child.children
      # children: child.children.map((x) => @tags.span "gutted", x)
    else
      @tags.span "gutted", [label, child]), opts

  copy: ({view, text}, opts) ->
    view = @render view, opts
    atom.commands.add view,
      'core:copy': (e) ->
        atom.clipboard.write text
        e.stopPropagation()
    view

  openEditorById: (id, line) ->
    for pane in atom.workspace.getPanes()
      for item in pane.getItems()
        if item.constructor.name is "TextEditor" and item.getBuffer().id is id
          pane.setActiveItem item
          item.setCursorBufferPosition [line, 0]
          item.scrollToCursorPosition()
          return true
    false

  getUntitledId: (file) -> file.match(/untitled-([\d\w]+)$/)?[1]

  link: ({file, line, contents}) ->
    view = @render @tags.a {href: '#'}, contents
    # TODO: maybe need to dispose of the tooltip onclick and readd them, but
    # that doesn't seem to be necessary
    if id = @getUntitledId file
      tt = atom.tooltips.add view, title: -> 'untitled'
      view.onclick = (e) =>
        @openEditorById id, line
        e.stopPropagation()
    else
      tt = atom.tooltips.add view, title: -> file
      view.onclick = (e) =>
        @ink.util.focusEditorPane()
        atom.workspace.open file,
          initialLine: if line >= 0 then line
          searchAllPanes: true
        e.stopPropagation()
    view.addEventListener 'DOMNodeRemovedFromDocument', =>
      tt.dispose()
    view

  number: ({value, full}) ->
    rounded = value.toPrecision(3)
    rounded += '…' unless rounded.toString().length >= full.length
    view = @render @tags.span 'syntax--constant syntax--number', rounded
    isfull = false
    view.onclick = (e) ->
      view.innerText = if !isfull then full else rounded
      isfull = !isfull
      e.stopPropagation()
    view

  code: ({text, scope}) ->
    grammar = atom.grammars.grammarForScopeName("source.julia")
    @render {type: 'html', content: Highlighter.highlight text, grammar}

  views:
    dom:     (a...) -> views.dom  a...
    html:    (a...) -> views.html a...
    tree:    (a...) -> views.tree a...
    lazy:    (a...) -> views.lazy a...
    subtree: (a...) -> views.subtree a...
    link:    (a...) -> views.link a...
    copy:    (a...) -> views.copy a...
    number:  (a...) -> views.number a...
    code:    (a...) -> views.code a...

  render: (data, opts = {}) ->
    if @views.hasOwnProperty(data.type)
      @views[data.type](data, opts)
    else if data?.constructor is String
      new Text data
    else
      @render "julia-client: can't render #{data?.type}"

  tag: (tag, attrs, contents) ->
    if attrs?.constructor is String
      attrs = class: attrs
    if attrs?.constructor isnt Object
      [contents, attrs] = [attrs, undefined]
    type: 'dom'
    tag: tag
    attrs: attrs
    contents: contents

  tags: {}

['div', 'span', 'a', 'strong', 'table', 'tr', 'td', 'webview'].forEach (tag) ->
  views.tags[tag] = (attrs, contents) ->
    views.tag tag, attrs, contents
