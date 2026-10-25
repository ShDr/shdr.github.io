// Shared by every page: footer year, home-page helpers, and the Markdown article renderer.
(function () {
  var year = document.getElementById('y');
  if (year) year.textContent = new Date().getFullYear();

  var SLUG = /^[\w-]+$/;

  // Language versions are named <base>-en.md / <base>-heb.md (a file with no suffix counts as English).
  var LANGS = {
    en: { label: 'EN', name: 'English', dir: 'ltr', suffixes: ['-en', ''] },
    he: { label: 'עב', name: 'עברית', dir: 'rtl', suffixes: ['-heb', '-he'] }
  };
  function baseOf(slug) { return slug.replace(/-(en|heb|he)$/, ''); }
  function langOf(slug, meta) {
    if (meta && meta.lang) return /^he/.test(meta.lang) ? 'he' : 'en';
    return /-(heb|he)$/.test(slug) ? 'he' : 'en';
  }

  // Splits an optional "---" front-matter block (key: value lines) from the Markdown body.
  function parse(md) {
    var meta = {};
    var m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (m) {
      m[1].split(/\r?\n/).forEach(function (line) {
        var i = line.indexOf(':');
        if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      });
      md = md.slice(m[0].length);
    }
    return { meta: meta, body: md };
  }

  function readingTime(text, lang) {
    var words = text.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
    var n = Math.max(1, Math.round(words / 200));
    return lang === 'he' ? n + ' דק׳ קריאה' : n + ' min read';
  }

  function fetchPost(slug) {
    return fetch('posts/' + slug + '.md').then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(parse);
  }

  function exists(slug) {
    return fetch('posts/' + slug + '.md', { method: 'HEAD' }).then(function (r) { return r.ok ? slug : null; }, function () { return null; });
  }

  // Resolves to { en: slug|null, he: slug|null } for every language version of a post.
  function versions(slug) {
    var base = baseOf(slug), out = {};
    return Promise.all(Object.keys(LANGS).map(function (code) {
      var tries = LANGS[code].suffixes.map(function (s) { return base + s; });
      if (tries.indexOf(slug) >= 0) { out[code] = slug; return; }
      return tries.reduce(function (p, s) {
        return p.then(function (found) { return found || exists(s); });
      }, Promise.resolve(null)).then(function (found) { out[code] = found; });
    })).then(function () { return out; });
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // Segmented EN | עב switch; the current language is highlighted, the other one links to its file.
  function langSwitch(vers, current) {
    var codes = Object.keys(LANGS).filter(function (c) { return vers[c]; });
    if (codes.length < 2) return null;
    var box = el('span', { class: 'lang-switch', role: 'group', 'aria-label': 'Language' });
    codes.forEach(function (c) {
      var L = LANGS[c];
      var a = el(c === current ? 'span' : 'a', { lang: c, title: L.name }, L.label);
      if (c === current) a.className = 'on';
      else a.href = 'post.html?p=' + vers[c];
      box.appendChild(a);
    });
    return box;
  }

  // ---------- Home page ----------
  document.querySelectorAll('section .post-list').forEach(function (list) {
    if (!list.querySelector('li')) list.closest('section').hidden = true;
  });

  document.querySelectorAll('[data-post]').forEach(function (li) {
    var slug = li.getAttribute('data-post');
    if (!SLUG.test(slug)) return;
    var meta = li.querySelector('.post-meta-wrapper');
    fetchPost(slug).then(function (post) {
      meta.appendChild(el('span', {}, readingTime(post.body, 'en')));
    }).catch(function () {});
    versions(slug).then(function (vers) {
      var sw = langSwitch(vers, null);
      if (sw) meta.insertBefore(sw, meta.firstChild);
    });
  });

  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/></svg> ';
  document.querySelectorAll('[data-repo]').forEach(function (li) {
    var out = li.querySelector('.repo-stars');
    if (!out) return;
    fetch('https://api.github.com/repos/' + li.getAttribute('data-repo'))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var n = d.stargazers_count || 0;
        out.innerHTML = STAR + (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n);
      })
      .catch(function () { out.innerHTML = STAR + '-'; });
  });

  // ---------- Article page (post.html?p=<slug>) ----------
  var article = document.getElementById('post');
  if (!article) return;

  var slug = new URLSearchParams(location.search).get('p') || '';
  var main = document.querySelector('main');
  var head = document.getElementById('post-head');
  function fail() {
    head.querySelector('h1').textContent = 'Post not found';
    head.querySelector('.meta').textContent = 'ERR::NOT_FOUND';
    document.title = 'Not found | Shlomi';
  }
  if (!SLUG.test(slug)) return fail();

  // Heading ids that survive Hebrew: keep letters/digits, join words with "-".
  function slugify(text, used) {
    var id = text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') || 'section';
    var unique = id, n = 2;
    while (used[unique]) unique = id + '-' + n++;
    used[unique] = true;
    return unique;
  }

  // Numbered table of contents from the article's ## and ### headings.
  function buildToc(lang) {
    var heads = article.querySelectorAll('h2, h3');
    var toc = document.getElementById('toc');
    if (heads.length < 2) return;
    var used = {}, ol = el('ol'), sub = null, n2 = 0, n3 = 0, links = [];
    heads.forEach(function (h) {
      h.id = slugify(h.textContent, used);
      var num = h.tagName === 'H2' ? (++n2, n3 = 0, n2 + '.') : n2 + '.' + (++n3);
      var a = el('a', { href: '#' + h.id });
      a.appendChild(el('span', { class: 'toc-num' }, num));
      a.appendChild(document.createTextNode(' ' + h.textContent));
      var li = el('li', {});
      li.appendChild(a);
      links.push([h, a]);
      if (h.tagName === 'H2' || !ol.lastChild) { ol.appendChild(li); sub = null; }
      else {
        if (!sub) { sub = el('ol'); ol.lastChild.appendChild(sub); }
        sub.appendChild(li);
      }
    });
    toc.querySelector('summary').textContent = lang === 'he' ? 'תוכן עניינים' : 'Contents';
    toc.appendChild(ol);
    toc.hidden = false;
    var wide = window.matchMedia('(min-width: 1280px)');
    toc.open = wide.matches;
    wide.addEventListener && wide.addEventListener('change', function (e) { toc.open = e.matches; });

    // Highlight the section currently being read.
    var active = null;
    function onScroll() {
      var cur = links[0];
      for (var i = 0; i < links.length; i++) {
        if (links[i][0].getBoundingClientRect().top < 120) cur = links[i]; else break;
      }
      if (cur[1] !== active) {
        if (active) active.classList.remove('active');
        active = cur[1];
        active.classList.add('active');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  fetchPost(slug).then(function (post) {
    var lang = langOf(slug, post.meta);
    main.setAttribute('lang', lang);
    main.setAttribute('dir', LANGS[lang].dir);
    head.querySelector('.back').textContent = lang === 'he' ? '→ חזרה' : '← cd ..';

    var tmp = document.createElement('div');
    tmp.innerHTML = marked.parse(post.body);
    // Title: front matter, else the first "# heading" (which is then not repeated in the body).
    var title = post.meta.title;
    var h1 = tmp.querySelector('h1');
    if (!title && h1) { title = h1.textContent; h1.remove(); }
    title = title || slug;

    head.querySelector('h1').textContent = title;
    var meta = head.querySelector('.meta');
    meta.innerHTML = '';
    [post.meta.date, readingTime(post.body, lang)].filter(Boolean).forEach(function (t) {
      meta.appendChild(el('span', {}, t));
    });
    document.title = title + ' | Shlomi';
    if (post.meta.description) document.querySelector('meta[name=description]').content = post.meta.description;

    // Links that leave the site open in a new tab; code always reads left to right.
    tmp.querySelectorAll('a[href^="http"]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
    tmp.querySelectorAll('pre').forEach(function (p) { p.setAttribute('dir', 'ltr'); });
    article.replaceChildren.apply(article, Array.prototype.slice.call(tmp.childNodes));
    if (window.hljs) article.querySelectorAll('pre code').forEach(function (c) { hljs.highlightElement(c); });

    buildToc(lang);
    if (location.hash) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }

    versions(slug).then(function (vers) {
      var sw = langSwitch(vers, lang);
      if (sw) head.querySelector('.head-top').appendChild(sw);
    });
  }).catch(fail);
})();
