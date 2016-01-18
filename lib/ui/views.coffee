module.exports = views =
  dom: ({tag, attrs, contents}) ->
    view = document.createElement tag
    for k, v of attrs
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
    view

  tree: ({head, children}) ->
    @ink.tree.treeView(@render(head), children.map((x)=>@render @tags.div [x]))[0]

  subtree: ({label, child}) ->
    @render if child.type == "tree"
      type: "tree"
      head: @tags.span [label, child.head]
      children: child.children
      # children: child.children.map((x) => @tags.span "gutted", x)
    else
      @tags.span "gutted", [label, child]

  link: ({file, line, contents}) ->
    view = @render @tags.a {href: '#'}, contents
    atom.tooltips.add view, title: -> file
    view.onclick = -> atom.workspace.open file, initialLine: line
    view

  views:
    dom:     (a...) -> views.dom  a...
    html:    (a...) -> views.html a...
    tree:    (a...) -> views.tree a...
    subtree: (a...) -> views.subtree a...
    link:    (a...) -> views.link a...

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

for tag in ['div', 'span', 'a', 'strong', 'table', 'tr', 'td']
  do (tag) ->
    views.tags[tag] = (attrs, contents) ->
      views.tag tag, attrs, contents
