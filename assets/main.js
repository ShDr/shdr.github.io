// Shared by every page: footer year, home-page helpers, and the Markdown article renderer.
(function () {
  var year = document.getElementById('y');
  if (year) year.textContent = new Date().getFullYear();

  var SLUG = /^[\w-]+$/;

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

  function readingTime(text) {
    var words = text.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200)) + ' min read';
  }

  function fetchPost(slug) {
    return fetch('posts/' + slug + '.md').then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(parse);
  }

  // ---------- Home page ----------
  document.querySelectorAll('section .post-list').forEach(function (list) {
    if (!list.querySelector('li')) list.closest('section').hidden = true;
  });

  document.querySelectorAll('[data-post]').forEach(function (li) {
    var slug = li.getAttribute('data-post');
    if (!SLUG.test(slug)) return;
    fetchPost(slug).then(function (post) {
      var span = document.createElement('span');
      span.textContent = readingTime(post.body);
      li.querySelector('.post-meta-wrapper').appendChild(span);
    }).catch(function () {});
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
  var head = document.getElementById('post-head');
  function fail() {
    head.innerHTML = '<p class="meta">ERR::NOT_FOUND</p><h1>Post not found</h1>';
    document.title = 'Not found | Shlomi';
  }
  if (!SLUG.test(slug)) return fail();

  fetchPost(slug).then(function (post) {
    var html = marked.parse(post.body);
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Title: front matter, else the first "# heading" in the file.
    var title = post.meta.title;
    var h1 = tmp.querySelector('h1');
    if (h1) { title = title || h1.textContent; h1.remove(); }
    title = title || slug;

    head.querySelector('h1').textContent = title;
    var meta = head.querySelector('.meta');
    meta.innerHTML = '';
    [post.meta.date, readingTime(post.body)].filter(Boolean).forEach(function (t) {
      var s = document.createElement('span'); s.textContent = t; meta.appendChild(s);
    });
    document.title = title + ' | Shlomi';
    if (post.meta.description) document.querySelector('meta[name=description]').content = post.meta.description;

    // Links that leave the site open in a new tab.
    tmp.querySelectorAll('a[href^="http"]').forEach(function (a) {
      a.target = '_blank'; a.rel = 'noopener';
    });
    article.replaceChildren.apply(article, Array.prototype.slice.call(tmp.childNodes));
    if (window.hljs) article.querySelectorAll('pre code').forEach(function (el) { hljs.highlightElement(el); });
  }).catch(fail);
})();
