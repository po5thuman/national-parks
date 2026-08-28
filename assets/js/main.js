/* ==========================================================================
   NATIONAL PARKS EDITORIAL PLATFORM — MAIN JS
   Vanilla ES6+ · Zero dependencies · GitHub Pages safe
   Modules:
     1. Sticky header state
     2. Accessible mobile navigation + multi-level dropdowns
     3. Breaking news ticker (auto-rotate, pause/next/prev)
     4. Auto-generated Table of Contents + ScrollSpy
     5. Outbound affiliate click interceptor (same-tab preserved)
     6. Dynamic Schema.org JSON-LD injector
     7. Back-to-top control
     8. Lazy image fade-in
   ========================================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     UTILITIES
     ---------------------------------------------------------------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const debounce = (fn, wait = 150) => {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  const throttle = (fn, limit = 100) => {
    let waiting = false;
    return function (...args) {
      if (waiting) return;
      fn.apply(this, args);
      waiting = true;
      setTimeout(() => { waiting = false; }, limit);
    };
  };

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const slugify = (str) =>
    String(str)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  /**
   * Resolves the site root prefix from the <body data-root="..."> attribute.
   * Root pages use "./", state hubs use "../../".
   * Guarantees GitHub Pages sub-path safety without hardcoding a domain.
   */
  const getRootPrefix = () => {
    const body = document.body;
    const declared = body && body.getAttribute('data-root');
    return declared && declared.length ? declared : './';
  };

   /** Builds an absolute URL from a relative path, using the live origin.
   *  Used ONLY for JSON-LD (schema requires absolute URLs) — never for markup. */
  const absUrl = (relative) => {
    try {
      return new URL(relative, window.location.href).href;
    } catch (err) {
      return window.location.href;
    }
  };

  /* ----------------------------------------------------------------------
     MODULE 1 — STICKY HEADER STATE
     ---------------------------------------------------------------------- */
  const StickyHeader = (() => {
    let header;

    const onScroll = throttle(() => {
      if (!header) return;
      header.classList.toggle('is-stuck', window.scrollY > 12);
    }, 100);

    const init = () => {
      header = $('[data-header]');
      if (!header) return;
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    };

    return { init };
  })();

  /* ----------------------------------------------------------------------
     MODULE 2 — ACCESSIBLE NAVIGATION (mobile drawer + dropdowns)
     ---------------------------------------------------------------------- */
  const Navigation = (() => {
    let toggle, nav, backdrop, body;
    let dropdownItems = [];
    let lastFocused = null;

    const FOCUSABLE = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

    /* ---- Drawer ---- */
    const openDrawer = () => {
      if (!nav || !toggle) return;
      lastFocused = document.activeElement;
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close main menu');
      if (backdrop) backdrop.classList.add('is-visible');
      body.classList.add('is-nav-open');

      const first = nav.querySelector(FOCUSABLE);
      if (first) window.setTimeout(() => first.focus(), 60);
      document.addEventListener('keydown', onDrawerKeydown);
    };

    const closeDrawer = ({ restoreFocus = true } = {}) => {
      if (!nav || !toggle) return;
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open main menu');
      if (backdrop) backdrop.classList.remove('is-visible');
      body.classList.remove('is-nav-open');
      document.removeEventListener('keydown', onDrawerKeydown);

      if (restoreFocus && lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
      // Collapse any expanded submenus so the drawer reopens in a clean state
      if (isMobile()) closeAllDropdowns();
    };

    const onDrawerKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== 'Tab' || !nav.classList.contains('is-open')) return;

      const focusables = $$(FOCUSABLE, nav).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;

      const first = focusables[0];
      const last  = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    /* ---- Dropdowns ---- */
    const closeAllDropdowns = (except = null) => {
      dropdownItems.forEach((item) => {
        if (item === except) return;
        item.classList.remove('is-open');
        const btn = item.querySelector('[data-dropdown-toggle]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    };

    const toggleDropdown = (item, force) => {
      const btn = item.querySelector('[data-dropdown-toggle]');
      const shouldOpen = typeof force === 'boolean' ? force : !item.classList.contains('is-open');
      closeAllDropdowns(item);
      item.classList.toggle('is-open', shouldOpen);
      if (btn) btn.setAttribute('aria-expanded', String(shouldOpen));
    };

    const bindDropdown = (item) => {
      const btn  = item.querySelector('[data-dropdown-toggle]');
      const menu = item.querySelector('.nav__dropdown');
      if (!btn || !menu) return;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleDropdown(item);
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          toggleDropdown(item, true);
          const firstLink = menu.querySelector('a');
          if (firstLink) firstLink.focus();
        } else if (e.key === 'Escape') {
          toggleDropdown(item, false);
          btn.focus();
        }
      });

      menu.addEventListener('keydown', (e) => {
        const links = $$('a', menu);
        const idx = links.indexOf(document.activeElement);

        if (e.key === 'Escape') {
          e.preventDefault();
          toggleDropdown(item, false);
          btn.focus();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          links[(idx + 1) % links.length].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          links[(idx - 1 + links.length) % links.length].focus();
        } else if (e.key === 'Tab' && !e.shiftKey && idx === links.length - 1) {
          toggleDropdown(item, false);
        }
      });

      // Desktop hover affordance
      item.addEventListener('mouseenter', () => { if (!isMobile()) toggleDropdown(item, true); });
      item.addEventListener('mouseleave', () => { if (!isMobile()) toggleDropdown(item, false); });
    };

    const init = () => {
      body     = document.body;
      toggle   = $('[data-nav-toggle]');
      nav      = $('[data-nav]');
      backdrop = $('[data-nav-backdrop]');
      dropdownItems = $$('[data-dropdown]');

      if (toggle && nav) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.addEventListener('click', () => {
          nav.classList.contains('is-open') ? closeDrawer() : openDrawer();
        });
      }

      if (backdrop) backdrop.addEventListener('click', () => closeDrawer());

      dropdownItems.forEach(bindDropdown);

      // Close dropdowns on outside click (desktop)
      document.addEventListener('click', (e) => {
        if (isMobile()) return;
        if (!e.target.closest('[data-dropdown]')) closeAllDropdowns();
      });

      // Close drawer when a nav link is followed (same-tab navigation)
      $$('.nav__link[href], .nav__dropdown-link', nav || document).forEach((link) => {
        link.addEventListener('click', () => {
          if (isMobile() && nav && nav.classList.contains('is-open')) {
            closeDrawer({ restoreFocus: false });
          }
        });
      });

      // Reset state when crossing the breakpoint
      window.addEventListener('resize', debounce(() => {
        if (!isMobile() && nav && nav.classList.contains('is-open')) {
          closeDrawer({ restoreFocus: false });
        }
        closeAllDropdowns();
      }, 180));
    };

    return { init };
  })();

  /* ----------------------------------------------------------------------
     MODULE 3 — BREAKING NEWS TICKER
     ---------------------------------------------------------------------- */
  const NewsTicker = (() => {
    let root, items = [], index = 0, timer = null, paused = false;
    const INTERVAL = 5200;

    const show = (next) => {
      if (!items.length) return;
      index = (next + items.length) % items.length;
      items.forEach((item, i) => {
        const active = i === index;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-hidden', String(!active));
      });
    };

    const start = () => {
      if (timer || prefersReducedMotion() || items.length < 2) return;
      timer = window.setInterval(() => { if (!paused) show(index + 1); }, INTERVAL);
    };

    const stop = () => { window.clearInterval(timer); timer = null; };

    const init = () => {
      root = $('[data-ticker]');
      if (!root) return;

      items = $$('.ticker__item', root);
      if (!items.length) return;

      show(0);
      start();

      const pauseBtn = $('[data-ticker-pause]', root);
      const nextBtn  = $('[data-ticker-next]', root);
      const prevBtn  = $('[data-ticker-prev]', root);

      if (nextBtn) nextBtn.addEventListener('click', () => show(index + 1));
      if (prevBtn) prevBtn.addEventListener('click', () => show(index - 1));

      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
          paused = !paused;
          pauseBtn.setAttribute('aria-pressed', String(paused));
          pauseBtn.setAttribute('aria-label', paused ? 'Resume news ticker' : 'Pause news ticker');
          pauseBtn.textContent = paused ? '▶' : '❚❚';
        });
      }

      // Pause on hover / keyboard focus for accessibility (WCAG 2.2.2)
      root.addEventListener('mouseenter', () => { paused = true; });
      root.addEventListener('mouseleave', () => {
        const btn = $('[data-ticker-pause]', root);
        if (!btn || btn.getAttribute('aria-pressed') !== 'true') paused = false;
      });
      root.addEventListener('focusin',  () => { paused = true; });
      root.addEventListener('focusout', () => {
        const btn = $('[data-ticker-pause]', root);
        if (!btn || btn.getAttribute('aria-pressed') !== 'true') paused = false;
      });

      // Suspend when tab is hidden — saves battery, avoids jump-on-return
      document.addEventListener('visibilitychange', () => {
        document.hidden ? stop() : start();
      });
    };

    return { init };
  })();

  /* ----------------------------------------------------------------------
     MODULE 4 — TABLE OF CONTENTS + SCROLLSPY
     ---------------------------------------------------------------------- */
  const TableOfContents = (() => {
    let tocRoot, articleRoot, links = [], headings = [], observer = null;

    const buildList = () => {
      const list = document.createElement('ul');
      list.className = 'toc__list';
      let currentSubList = null;

      headings.forEach((heading) => {
        if (!heading.id) heading.id = slugify(heading.textContent) || `section-${Math.random().toString(36).slice(2, 8)}`;

        const li = document.createElement('li');
        li.className = 'toc__item';

                const a = document.createElement('a');
        a.className = 'toc__link' + (heading.tagName === 'H3' ? ' toc__link--h3' : '');
        a.href = `#${heading.id}`;
        a.textContent = heading.textContent.trim();
        a.setAttribute('data-toc-link', heading.id);
        li.appendChild(a);

        if (heading.tagName === 'H2') {
          list.appendChild(li);
          currentSubList = null;
        } else {
          // Nest H3s under the preceding H2 when one exists
          const lastItem = list.lastElementChild;
          if (lastItem) {
            if (!currentSubList) {
              currentSubList = document.createElement('ul');
              currentSubList.className = 'toc__list';
              lastItem.appendChild(currentSubList);
            }
            currentSubList.appendChild(li);
          } else {
            list.appendChild(li);
          }
        }
      });

      return list;
    };

    const setActive = (id) => {
      links.forEach((link) => {
        const isActive = link.getAttribute('data-toc-link') === id;
        link.classList.toggle('is-active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    const initScrollSpy = () => {
      if (!('IntersectionObserver' in window)) return;

      observer = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length) {
          setActive(visible[0].target.id);
        }
      }, {
        rootMargin: '-15% 0px -70% 0px',
        threshold: 0
      });

      headings.forEach((h) => observer.observe(h));
    };

    const init = () => {
      tocRoot = $('[data-toc]');
      if (!tocRoot) return;

      const scope = tocRoot.getAttribute('data-toc') || '[data-article-body]';
      articleRoot = $(scope);
      if (!articleRoot) return;

      headings = $$('h2, h3', articleRoot).filter((h) => !h.hasAttribute('data-toc-skip'));
      if (headings.length < 2) {
        tocRoot.hidden = true;
        return;
      }

      const heading = document.createElement('h2');
      heading.className = 'toc__title';
      heading.textContent = 'On This Page';

      tocRoot.innerHTML = '';
      tocRoot.setAttribute('role', 'navigation');
      tocRoot.setAttribute('aria-label', 'Table of contents');
      tocRoot.appendChild(heading);
      tocRoot.appendChild(buildList());

      links = $$('[data-toc-link]', tocRoot);

      // Smooth scroll + focus management for keyboard users
      links.forEach((link) => {
        link.addEventListener('click', (e) => {
          const id = link.getAttribute('data-toc-link');
          const target = document.getElementById(id);
          if (!target) return;

          e.preventDefault();
          target.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'start'
          });

          // Move focus to the section for screen-reader continuity
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });

          if (history.pushState) history.pushState(null, '', `#${id}`);
          setActive(id);
        });
      });

      initScrollSpy();
    };

    return { init };
  })();

  /* ----------------------------------------------------------------------
     MODULE 5 — OUTBOUND / AFFILIATE CLICK INTERCEPTOR
     Logs the intent, appends tracking params, and preserves SAME-TAB
     navigation (no window.open, no target swap).
     ---------------------------------------------------------------------- */
  const OutboundTracker = (() => {
    const isExternal = (anchor) => {
      if (!anchor.href) return false;
      if (/^(mailto:|tel:|#)/i.test(anchor.getAttribute('href') || '')) return false;
      try {
        return new URL(anchor.href, window.location.href).hostname !== window.location.hostname;
      } catch (err) {
        return false;
      }
    };

    const decorate = (url, anchor) => {
      try {
        const u = new URL(url, window.location.href);
        const campaign = anchor.getAttribute('data-affiliate') || 'editorial';
        if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'trailhead-journal');
        if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'affiliate');
        if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', campaign);
        return u.href;
      } catch (err) {
        return url;
      }
    };

    const push = (payload) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
    };

    const init = () => {
      document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href]');
        if (!anchor) return;

        const affiliate = anchor.hasAttribute('data-affiliate');
        if (!affiliate && !isExternal(anchor)) return;

        // Security hardening for any link that does open in a new context
        if (anchor.target === '_blank') anchor.rel = 'noopener noreferrer';

        // Enforce same-tab navigation per editorial spec
        if (!anchor.hasAttribute('data-allow-newtab')) {
          anchor.setAttribute('target', '_self');
        }

        if (affiliate) {
          anchor.rel = (anchor.rel ? anchor.rel + ' ' : '') + 'sponsored nofollow';
          const decorated = decorate(anchor.href, anchor);
          if (decorated !== anchor.href) anchor.href = decorated;
        }

        push({
          event: affiliate ? 'affiliate_click' : 'outbound_click',
          link_url: anchor.href,
          link_text: (anchor.textContent || '').trim().slice(0, 120),
          link_campaign: anchor.getAttribute('data-affiliate') || null,
          page_path: window.location.pathname
        });

        // No preventDefault → browser completes navigation in the same tab.
      }, { capture: true });
    };

    return { init };
  })();

  /* ----------------------------------------------------------------------
     MODULE 6 — DYNAMIC SCHEMA.ORG JSON-LD INJECTOR
     Reads declarative data-* attributes from <body> and emits valid,
     absolute-URL structured data for Google + AI search surfaces.
     ---------------------------------------------------------------------- */
  const SchemaInjector = (() => {
    const SITE_NAME = 'Trailhead Journal';
    const PUBLISHER_LOGO = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=512&q=80';

    const inject = (obj, id) => {
      if (!obj) return;
      const existing = document.getElementById(id);
      if (existing) existing.remove();
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = id;
      script.textContent = JSON.stringify(obj, null, 2);
      document.head.appendChild(script);
    };

    const buildWebSite = () => ({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': absUrl(getRootPrefix()) + '#website',
      name: SITE_NAME,
      alternateName: 'Trailhead Journal — National Park Editorial',
      url: absUrl(getRootPrefix()),
      inLanguage: 'en-US',
      publisher: { '@id': absUrl(getRootPrefix()) + '#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: absUrl(getRootPrefix()) + 'search.html?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    });

    const buildOrganization = () => ({
      '@context': 'https://schema.org',
      '@type': 'NewsMediaOrganization',
      '@id': absUrl(getRootPrefix()) + '#organization',
      name: SITE_NAME,
      url: absUrl(getRootPrefix()),
      logo: {
        '@type': 'ImageObject',
        url: PUBLISHER_LOGO,
        width: 512,
        height: 512
      },
      sameAs: [
        'https://www.instagram.com/',
        'https://www.youtube.com/',
        'https://www.threads.net/'
      ],
      ethicsPolicy: absUrl(getRootPrefix() + 'editorial-policy.html'),
      diversityPolicy: absUrl(getRootPrefix() + 'editorial-policy.html')
    });

    const buildBreadcrumbs = () => {
      const nodes = $$('[data-breadcrumb] li');
      if (!nodes.length) return null;

      const items = nodes.map((li, i) => {
        const link = li.querySelector('a');
        return {
          '@type': 'ListItem',
          position: i + 1,
          name: (li.textContent || '').trim(),
          item: link ? absUrl(link.getAttribute('href')) : window.location.href
        };
      });

      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        '@id': window.location.href + '#breadcrumbs',
        itemListElement: items
      };
    };

    const buildPage = () => {
      const b = document.body;
      const type = b.getAttribute('data-schema-type') || 'WebPage';
      const title = b.getAttribute('data-schema-title') || document.title;
      const desc = b.getAttribute('data-schema-description') ||
        (document.querySelector('meta[name="description"]') || {}).content || '';
      const image = b.getAttribute('data-schema-image') || PUBLISHER_LOGO;
      const published = b.getAttribute('data-schema-published');
      const modified = b.getAttribute('data-schema-modified') || published;
      const author = b.getAttribute('data-schema-author');
      const section = b.getAttribute('data-schema-section');

      const base = {
        '@context': 'https://schema.org',
        '@type': type,
        '@id': window.location.href + '#page',
        url: window.location.href,
        name: title,
        headline: title,
        description: desc,
        inLanguage: 'en-US',
        isPartOf: { '@id': absUrl(getRootPrefix()) + '#website' },
        primaryImageOfPage: { '@type': 'ImageObject', url: image },
        image: { '@type': 'ImageObject', url: image, width: 1600, height: 900 }
      };

      if (published) base.datePublished = published;
      if (modified)  base.dateModified  = modified;
      if (section)   base.articleSection = section;

      if (type === 'NewsArticle' || type === 'Article') {
        base.author = {
          '@type': 'Person',
          name: author || 'Trailhead Journal Editorial Desk'
        };
        base.publisher = { '@id': absUrl(getRootPrefix()) + '#organization' };
        base.mainEntityOfPage = { '@type': 'WebPage', '@id': window.location.href };
      }

            if (type === 'CollectionPage' || type === 'ItemPage') {
        const cards = $$('[data-schema-item]');
        if (cards.length) {
          base.mainEntity = {
            '@type': 'ItemList',
            numberOfItems: cards.length,
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            itemListElement: cards.map((card, i) => {
              const link = card.querySelector('a[href]');
              return {
                '@type': 'ListItem',
                position: i + 1,
                name: card.getAttribute('data-schema-item') || (card.textContent || '').trim().slice(0, 110),
                url: link ? absUrl(link.getAttribute('href')) : window.location.href
              };
            })
          };
        }
      }

      return base;
    };

    const init = () => {
      if (document.body.hasAttribute('data-schema-disabled')) return;
      inject(buildWebSite(), 'ld-website');
      inject(buildOrganization(), 'ld-organization');
      inject(buildPage(), 'ld-page');
      const crumbs = buildBreadcrumbs();
      if (crumbs) inject(crumbs, 'ld-breadcrumbs');
    };

    return { init };
  })();

  /* ----------------------------------------------------------------------
     MODULE 7 — BACK TO TOP
     ---------------------------------------------------------------------- */
  const BackToTop = (() => {
    let btn;

    const onScroll = throttle(() => {
      if (!btn) return;
      btn.classList.toggle('is-visible', window.scrollY > 700);
    }, 160);

    const init = () => {
      btn = $('[data-back-to-top]');
      if (!btn) return;

      btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        const skip = $('.skip-link') || $('[data-header] a');
        if (skip) skip.focus({ preventScroll: true });
      });

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    };

    return { init };
  })();

  /* ----------------------------------------------------------------------
     MODULE 8 — IMAGE FADE-IN + BROKEN IMAGE GUARD
     ---------------------------------------------------------------------- */
  const ImageEnhancer = (() => {
    const FALLBACK = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=70';

    const init = () => {
      $$('img').forEach((img) => {
        if (!img.hasAttribute('loading') && !img.hasAttribute('data-priority')) {
          img.setAttribute('loading', 'lazy');
        }
        if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');

        img.addEventListener('error', function handleError() {
          if (img.dataset.fallbackApplied) return;
          img.dataset.fallbackApplied = 'true';
          img.src = FALLBACK;
        });
      });
    };

    return { init };
  })();

  /* ----------------------------------------------------------------------
     MODULE 9 — CURRENT YEAR + LAST UPDATED STAMPS
     ---------------------------------------------------------------------- */
  const Stamps = (() => {
    const init = () => {
      const year = String(new Date().getFullYear());
      $$('[data-current-year]').forEach((el) => { el.textContent = year; });
    };
    return { init };
  })();

  /* ----------------------------------------------------------------------
     BOOTSTRAP
     ---------------------------------------------------------------------- */
  const boot = () => {
    try { StickyHeader.init(); }     catch (e) { console.warn('StickyHeader:', e); }
    try { Navigation.init(); }       catch (e) { console.warn('Navigation:', e); }
    try { NewsTicker.init(); }       catch (e) { console.warn('NewsTicker:', e); }
    try { TableOfContents.init(); }  catch (e) { console.warn('TOC:', e); }
    try { OutboundTracker.init(); }  catch (e) { console.warn('Outbound:', e); }
    try { SchemaInjector.init(); }   catch (e) { console.warn('Schema:', e); }
    try { BackToTop.init(); }        catch (e) { console.warn('BackToTop:', e); }
    try { ImageEnhancer.init(); }    catch (e) { console.warn('Images:', e); }
    try { Stamps.init(); }           catch (e) { console.warn('Stamps:', e); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Public namespace for future page-level extensions
  window.TrailheadJournal = { $, $$, slugify, absUrl, getRootPrefix };
})();