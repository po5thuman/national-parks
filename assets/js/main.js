/**
 * National Park Travel Authority - Production Modular Architecture
 * ES6 Vanilla JavaScript Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  init() {
    this.initMobileNav();
    this.initTableOfContents();
    this.initAffiliateInterceptor();
    this.initSchemaInjector();
  },

  /**
   * 1. Accessible Mobile Navigation & Multi-Tier Dropdowns
   */
  initMobileNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const dropdownParents = document.querySelectorAll('.nav-item.has-dropdown');

    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', !isExpanded);
        navMenu.classList.toggle('is-active');
      });
    }

    // Handle dropdown toggles on touch/mobile devices
    dropdownParents.forEach((parent) => {
      const link = parent.querySelector('.nav-link');
      const dropdown = parent.querySelector('.dropdown-menu');

      if (link && dropdown) {
        link.addEventListener('click', (e) => {
          if (window.innerWidth < 992) {
            e.preventDefault();
            const isActive = dropdown.classList.contains('is-active');
            
            // Close other open dropdowns
            document.querySelectorAll('.dropdown-menu').forEach((d) => d.classList.remove('is-active'));
            
            if (!isActive) {
              dropdown.classList.add('is-active');
            }
          }
        });
      }
    });
  },

  /**
   * 2. Auto-Generates Nested Table of Contents from h2/h3 inside <article>
   */
  initTableOfContents() {
    const article = document.querySelector('article.main-article');
    const tocContainer = document.getElementById('toc-target');

    if (!article || !tocContainer) return;

    const headings = article.querySelectorAll('h2, h3');
    if (headings.length === 0) {
      tocContainer.parentElement.style.display = 'none';
      return;
    }

    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Table of Contents');
    const mainList = document.createElement('ul');
    mainList.className = 'toc-list';

    let currentH2List = null;

    headings.forEach((heading, index) => {
      // Auto-assign IDs if absent
      if (!heading.id) {
        heading.id = `section-${index + 1}-${heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
      }

      const listItem = document.createElement('li');
      listItem.className = 'toc-item';

      const link = document.createElement('a');
      link.className = 'toc-link';
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;

      listItem.appendChild(link);

      if (heading.tagName.toLowerCase() === 'h2') {
        currentH2List = document.createElement('ul');
        listItem.appendChild(currentH2List);
        mainList.appendChild(listItem);
      } else if (heading.tagName.toLowerCase() === 'h3') {
        if (currentH2List) {
          currentH2List.appendChild(listItem);
        } else {
          mainList.appendChild(listItem);
        }
      }
    });

    // Remove empty sub-lists
    mainList.querySelectorAll('ul:empty').forEach((ul) => ul.remove());
    nav.appendChild(mainList);
    tocContainer.appendChild(nav);

    this.initTocScrollSpy(headings);
  },

  /**
   * ScrollSpy observer for TOC active link highlighting
   */
  initTocScrollSpy(headings) {
    const observerOptions = {
      root: null,
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          document.querySelectorAll('.toc-link').forEach((link) => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('is-active');
              link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
              link.classList.remove('is-active');
            }
          });
        }
      });
    }, observerOptions);

    headings.forEach((heading) => observer.observe(heading));
  },

  /**
   * 3. Outbound Link Interceptor for Tracking & Compliance
   */
  initAffiliateInterceptor() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.affiliate-btn, a[rel*="sponsored"]');
      if (target) {
        const destination = target.getAttribute('href');
        const merchant = target.dataset.merchant || 'General Affiliate';

        // Log outbound click event
        console.log(`[Affiliate Outbound Event] Destination: ${destination} | Merchant: ${merchant}`);

        // Standard safety attributes assertion without opening in a new tab
        target.setAttribute('rel', 'noopener sponsored noreferrer');
      }
    });
  },

  /**
   * 4. Dynamic Vanilla JS JSON-LD Schema.org Injector
   */
  initSchemaInjector() {
    const pageType = document.body.dataset.schemaType || 'WebPage';
    const schemas = [];

    // 1. BreadcrumbList Schema Generation
    const breadcrumbItems = document.querySelectorAll('.breadcrumb-list .breadcrumb-item');
    if (breadcrumbItems.length > 0) {
      const itemListElement = [];
      breadcrumbItems.forEach((item, idx) => {
        const link = item.querySelector('a');
        const name = item.textContent.trim();
        const url = link ? link.href : window.location.href;

        itemListElement.push({
          '@type': 'ListItem',
          'position': idx + 1,
          'name': name,
          'item': url
        });
      });

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': itemListElement
      });
    }

    // 2. Specialized Page Schemas (Article / TouristAttraction / CollectionPage)
    if (pageType === 'Article') {
      const articleTitle = document.querySelector('h1')?.textContent || document.title;
      const datePublished = document.body.dataset.datePublished || new Date().toISOString();
      const author = document.body.dataset.author || 'National Park Travel Authority';

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': articleTitle,
        'datePublished': datePublished,
        'author': {
          '@type': 'Organization',
          'name': author
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'National Park Travel Authority',
          'logo': {
            '@type': 'ImageObject',
            'url': new URL('assets/images/logo.png', window.location.origin).href
          }
        },
        'mainEntityOfPage': window.location.href
      });
    } else if (pageType === 'TouristAttraction') {
      const attractionName = document.body.dataset.parkName || document.title;
      const state = document.body.dataset.state || 'Utah';

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        'name': attractionName,
        'location': {
          '@type': 'Place',
          'address': {
            '@type': 'PostalAddress',
            'addressRegion': state,
            'addressCountry': 'US'
          }
        }
      });
    }

    // Inject JSON-LD to <head>
    schemas.forEach((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    });
  }
};