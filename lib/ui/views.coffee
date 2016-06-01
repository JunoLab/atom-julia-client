{highlight} = require './highlighter'

module.exports = views =
  dom: ({tag, attrs, contents}) ->
    view = document.createElement tag
    for k, v of attrs
      if v instanceof Array then v = v.join ' '
      view.setAttribute k, v
    if contents?
      if contents.constructor isnt Array
        contents = [contents]
      for child in contents
        view.appendChild @render child
    view

  html: ({content}) ->
    view = @render @tags.div()
    view.innerHTML = content
    view = if view.children.length == 1 then view.children[0] else view

  tree: ({head, children, expand}) ->
    @ink.tree.treeView(@render(head),
                       children.map((x)=>@render @tags.div [x]),
                       expand: expand)

  subtree: ({label, child}) ->
    @render if child.type == "tree"
      type: "tree"
      head: @tags.span [label, child.head]
      children: child.children
      # children: child.children.map((x) => @tags.span "gutted", x)
    else
      @tags.span "gutted", [label, child]

  copy: ({view, text}) ->
    view = @render view
    atom.commands.add view,
      'core:copy': (e) ->
        atom.clipboard.write text
        e.stopPropagation()
    view

  link: ({file, line, contents}) ->
    view = @render @tags.a {href: '#'}, contents
    atom.tooltips.add view, title: -> file
    view.onclick = ->
      atom.workspace.open file,
        initialLine: if line >= 0 then line
        searchAllPanes: true
    view

  number: ({value, full}) ->
    view = @render @tags.span 'constant number', value.toPrecision(3)
    isfull = false
    view.onclick = ->
      view.innerText = if !isfull then full else value.toPrecision(3)
      isfull = !isfull
    view

  code: ({text, scope}) ->
    grammar = atom.grammars.grammarForScopeName("source.julia")
    @render {type: 'html', content: highlight text, grammar}

  views:
    dom:     (a...) -> views.dom  a...
    html:    (a...) -> views.html a...
    tree:    (a...) -> views.tree a...
    subtree: (a...) -> views.subtree a...
    link:    (a...) -> views.link a...
    copy:    (a...) -> views.copy a...
    number:  (a...) -> views.number a...
    code:    (a...) -> views.code a...

  render: (data) ->
    if @views.hasOwnProperty(data.type)
      @views[data.type](data)
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

['div', 'span', 'a', 'strong', 'table', 'tr', 'td'].forEach (tag) ->
  views.tags[tag] = (attrs, contents) ->
    views.tag tag, attrs, contents
