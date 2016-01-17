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
    @ink.tree.treeView @render(head), children.map((x)=>@render(x))

  views:
    dom:  (x) -> views.dom x
    html: (x) -> views.html x
    tree: (x) -> views.tree x

  render: (data) ->
    console.log data
    if @views.hasOwnProperty(data.type)
      @views[data.type](data)
    else if data?.constructor is String
      new Text data
    else
      @render "can't render #{data?.type}"

  tag: (tag, attrs, contents) ->
    if attrs?.constructor isnt Object
      [contents, attrs] = [attrs, undefined]
    type: 'dom'
    tag: tag
    attrs: attrs
    contents: contents

  tags: {}

for tag in ['div', 'span', 'strong', 'table', 'tr', 'td']
  do (tag) ->
    views.tags[tag] = (attrs, contents) ->
      views.tag tag, attrs, contents
