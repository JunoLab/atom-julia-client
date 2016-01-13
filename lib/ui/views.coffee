module.exports = views =
  handlers:
    dom: ({tag, attrs, contents}) ->
      view = document.createElement tag
      for k, v of attrs
        view.setAttribute k, v
      if contents?
        # Special case -- avoid the nested <span>
        if contents.constructor is String
          view.innerText = contents
        else
          if contents.constructor isnt Array
            contents = [contents]
          for child in contents
            view.appendChild @render child
      view

    html: ({contents}) ->
      view = @render @tags.div()
      view.innerHTML = contents
      view

  render: (data) ->
    if @handlers.hasOwnProperty(data.type)
      @handlers[data.type].call this, data
    else if data?.constructor is String
      @render @tags.span data
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
