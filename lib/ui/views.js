'use babel'
import * as Highlighter from './highlighter';
import  client  from '../connection/client';
import { once } from '../misc';

const getlazy = client.import('getlazy');

let ink;
export function activate (ink_in) {
  ink = ink_in
}

export function dom({tag, attrs, contents}, opts) {
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
        view.appendChild(render(child, opts));
      }
    }
    return view;
}

export function html(...args) {
    const obj = args[0],
      {
        content
      } = obj,
      val = obj.block,
      block = val != null ? val : false;
    let view = render(block ? tags.div() : tags.span());
    view.innerHTML = content;
    return view = view.children.length === 1 ? view.children[0] : view;
}

export function tree({head, children, expand}, opts) {
    ink.tree.treeView(render(head, opts),
      children.map(x=> render(tags.div([x]), opts)),
      {expand});
}

export function lazy({head, id}, opts) {
    const conn = client.conn;
    if (opts.registerLazy != null) {
      opts.registerLazy(id);
    } else {
      console.warn('Unregistered lazy view');
    }
    let view;
    return view = ink.tree.treeView(render(head, opts), [], {
        onToggle: once(() => {
          if (client.conn !== conn) { return; }
          getlazy(id).then(children => {
            const body = view.querySelector(':scope > .body');
            children.map(x => render(tags.div([x]), opts)).forEach(x => {
              body.appendChild(ink.ansiToHTML(x));
            });
          });
        })
      }
    );
}

export function subtree({label, child}, opts) {
    return render((child.type === "tree" ?{
        type: "tree",
        head: tags.span([label, child.head]),
        children: child.children
      }
      // children: child.children.map((x) => @tags.span "gutted", x)
      :
      tags.span("gutted", [label, child])), opts);
}

export function copy({view, text}, opts) {
    view = render(view, opts);
    atom.commands.add(view, {
        'core:copy'(e) {
          atom.clipboard.write(text);
          e.stopPropagation();
        }
      }
    );
    return view;
}

export function link({file, line, contents}) {
    const view = render(tags.a({href: '#'}, contents));
    // TODO: maybe need to dispose of the tooltip onclick and readd them, but
    // that doesn't seem to be necessary
    let tt;
    if (ink.Opener.isUntitled(file)) {
      tt = atom.tooltips.add(view, {title() { return 'untitled'; }});
    } else {
      tt = atom.tooltips.add(view, {title() { return file; }});
    }
    view.onclick = e => {
      ink.Opener.open(file, line, {
        pending: atom.config.get('core.allowPendingPaneItems')
      });
      e.stopPropagation();
    };
    view.addEventListener('DOMNodeRemovedFromDocument', () => {
      tt.dispose();
    });
    return view;
}

export function number({value, full}) {
    let rounded = value.toPrecision(3);
    if (rounded.toString().length < full.length) { rounded += '…'; }
    const view = render(tags.span('syntax--constant syntax--numeric', rounded));
    let isfull = false;
    view.onclick = function(e) {
      view.innerText = !isfull ? full : rounded;
      isfull = !isfull;
      e.stopPropagation();
    };
    return view;
}

export function code({text, attrs, scope}) {
    const grammar = atom.grammars.grammarForScopeName("source.julia");
    const block = (attrs != null ? attrs.block : undefined) || false; // attrs?.block || false
    const highlighted = Highlighter.highlight(text, grammar, {scopePrefix: 'syntax--', block});
    return render({type: 'html', block, content: highlighted});
}

export function latex({attrs, text}) {
    const block = (attrs != null ? attrs.block : undefined) || false; // attrs?.block || false
    const latex = ink.KaTeX.texify(text, block);
    return render({type: 'html', block, content: latex});
}

export const views = {
    // TODO do we need ...a
    dom(...a) { return dom(...a); },
    html(...a) { return html(...a); },
    tree(...a) { return tree(...a); },
    lazy(...a) { return lazy(...a); },
    subtree(...a) { return subtree(...a); },
    link(...a) { return link(...a); },
    copy(...a) { return copy(...a); },
    number(...a) { return number(...a); },
    code(...a) { return code(...a); },
    latex(...a) { return latex(...a); }
}

export function render(data, opts = {}) {
    if (views.hasOwnProperty(data.type)) {
      const r = views[data.type](data, opts);
      ink.ansiToHTML(r);
      return r;
    } else if ((data != null ? data.constructor : undefined) === String) { // data?.constructor === String
      return new Text(data);
    } else {
      return render(`julia-client: can't render ${(data != null ? data.type : undefined)}`); // data?.type
    }
}

export function tag(tag, attrs, contents) {
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
}

export let tags = {}
const tags_arr = ['div', 'span', 'a', 'strong', 'table', 'tr', 'td', 'webview']
for (let _tag of tags_arr) {
  tags[_tag] = (attrs, contents) => tag(_tag, attrs, contents)
}
