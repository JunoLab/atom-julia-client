'use babel'
import * as Highlighter from './highlighter';
import  client  from '../connection/client';
import { once } from '../misc';

const getlazy = client.import('getlazy');

let views;
export default views = {
  dom({tag, attrs, contents}, opts) {
    const view = document.createElement(tag);
    for (let k in attrs) {
      let v = attrs[k];
      if (v instanceof Array) { v = v.join(' '); }
      view.setAttribute(k, v);
    }
    if (contents != null) {
      if (contents.constructor !== Array) {
        contents = [contents];
      }
      for (let child of contents) {
        view.appendChild(this.render(child, opts));
      }
    }
    return view;
  },

  html(...args) {
    const obj = args[0],
      {
        content
      } = obj,
      val = obj.block,
      block = val != null ? val : false;
    let view = this.render(block ? this.tags.div() : this.tags.span());
    view.innerHTML = content;
    return view = view.children.length === 1 ? view.children[0] : view;
  },

  tree({head, children, expand}, opts) {
    this.ink.tree.treeView(this.render(head, opts),
      children.map(x=> this.render(this.tags.div([x]), opts)),
      {expand});
  },

  lazy({head, id}, opts) {
    const conn = client.conn;
    if (opts.registerLazy != null) {
      opts.registerLazy(id);
    } else {
      console.warn('Unregistered lazy view');
    }
    let view;
    return view = this.ink.tree.treeView(this.render(head, opts), [], {
        onToggle: once(() => {
          if (client.conn !== conn) { return; }
          getlazy(id).then(children => {
            const body = view.querySelector(':scope > .body');
            children.map(x => this.render(this.tags.div([x]), opts)).forEach(x => {
              body.appendChild(this.ink.ansiToHTML(x));
            });
          });
        })
      }
    );
  },

  subtree({label, child}, opts) {
    return this.render((child.type === "tree" ?{
        type: "tree",
        head: this.tags.span([label, child.head]),
        children: child.children
      }
      // children: child.children.map((x) => @tags.span "gutted", x)
      :
      this.tags.span("gutted", [label, child])), opts);
  },

  copy({view, text}, opts) {
    view = this.render(view, opts);
    atom.commands.add(view, {
        'core:copy'(e) {
          atom.clipboard.write(text);
          e.stopPropagation();
        }
      }
    );
    return view;
  },

  link({file, line, contents}) {
    const view = this.render(this.tags.a({href: '#'}, contents));
    // TODO: maybe need to dispose of the tooltip onclick and readd them, but
    // that doesn't seem to be necessary
    let tt;
    if (this.ink.Opener.isUntitled(file)) {
      tt = atom.tooltips.add(view, {title() { return 'untitled'; }});
    } else {
      tt = atom.tooltips.add(view, {title() { return file; }});
    }
    view.onclick = e => {
      this.ink.Opener.open(file, line, {
        pending: atom.config.get('core.allowPendingPaneItems')
      });
      e.stopPropagation();
    };
    view.addEventListener('DOMNodeRemovedFromDocument', () => {
      tt.dispose();
    });
    return view;
  },

  number({value, full}) {
    let rounded = value.toPrecision(3);
    if (rounded.toString().length < full.length) { rounded += '…'; }
    const view = this.render(this.tags.span('syntax--constant syntax--numeric', rounded));
    let isfull = false;
    view.onclick = function(e) {
      view.innerText = !isfull ? full : rounded;
      isfull = !isfull;
      e.stopPropagation();
    };
    return view;
  },

  code({text, attrs, scope}) {
    const grammar = atom.grammars.grammarForScopeName("source.julia");
    const block = (attrs != null ? attrs.block : undefined) || false; // attrs?.block || false
    const highlighted = Highlighter.highlight(text, grammar, {scopePrefix: 'syntax--', block});
    return this.render({type: 'html', block, content: highlighted});
  },

  latex({attrs, text}) {
    const block = (attrs != null ? attrs.block : undefined) || false; // attrs?.block || false
    const latex = this.ink.KaTeX.texify(text, block);
    return this.render({type: 'html', block, content: latex});
  },

  views: {
    // TODO Remove unnecessary use of Array.from
    dom(...a) { return views.dom(...Array.from(a || [])); },
    html(...a) { return views.html(...Array.from(a || [])); },
    tree(...a) { return views.tree(...Array.from(a || [])); },
    lazy(...a) { return views.lazy(...Array.from(a || [])); },
    subtree(...a) { return views.subtree(...Array.from(a || [])); },
    link(...a) { return views.link(...Array.from(a || [])); },
    copy(...a) { return views.copy(...Array.from(a || [])); },
    number(...a) { return views.number(...Array.from(a || [])); },
    code(...a) { return views.code(...Array.from(a || [])); },
    latex(...a) { return views.latex(...Array.from(a || [])); }
  },

  render(data, opts = {}) {
    if (this.views.hasOwnProperty(data.type)) {
      const r = this.views[data.type](data, opts);
      this.ink.ansiToHTML(r);
      return r;
    } else if ((data != null ? data.constructor : undefined) === String) { // data?.constructor === String
      return new Text(data);
    } else {
      return this.render(`julia-client: can't render ${(data != null ? data.type : undefined)}`); // data?.type
    }
  },

  tag(tag, attrs, contents) {
    if ((attrs != null ? attrs.constructor : undefined) === String) { // attrs?.constructor === String
      attrs = {class: attrs};
    }
    if ((attrs != null ? attrs.constructor : undefined) !== Object) { // attrs?.constructor  !== Object
      [contents, attrs] = [attrs, undefined];
    }
    return {
      type: 'dom',
      tag,
      attrs,
      contents
    };
  },

  tags: {}
};

['div', 'span', 'a', 'strong', 'table', 'tr', 'td', 'webview'].forEach(tag => views.tags[tag] = (attrs, contents) => views.tag(tag, attrs, contents));
