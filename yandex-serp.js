// ==UserScript==
// @name         Yandex SERP Parser
// @namespace    https://yandex.ru/search/
// @version      0.1.2
// @description  Автоматически собирает результаты выдачи Яндекса: запрос, рекламу, ссылку, анкор, описание и служебные поля.
// @author       you
// @match        https://yandex.ru/search/*
// @match        https://yandex.*/*search/*
// @match        https://ya.ru/search/*
// @run-at       document-idle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'ysp_rows_v1';
  const PANEL_ID = 'ysp-panel';
  const state = {
    rows: loadRows(),
    status: '',
    collectTimer: null,
  };

  function loadRows() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const rows = new Map();

      stored.forEach((entry) => {
        const row = Array.isArray(entry) ? entry[1] : entry;
        if (!row || typeof row !== 'object') return;
        delete row.collectedAt;

        if (isYandexRedirectUrl(row.url)) {
          const exportUrl = displayUrlToRealUrl(row.displayUrl);
          if (exportUrl) {
            row.url = exportUrl;
            row.domain = getDomain(exportUrl);
          }
        }

        rows.set(makeRowKey(row), row);
      });

      if (rows.size !== stored.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...rows.entries()]));
      }

      return rows;
    } catch {
      return new Map();
    }
  }

  function saveRows() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.rows.entries()]));
  }

  function normalizeText(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getQuery() {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('text') || params.get('query') || params.get('q');
    if (fromUrl) return normalizeText(fromUrl);

    const input = document.querySelector('input[name="text"], input[name="query"], input[type="search"]');
    return normalizeText(input?.value || '');
  }

  function isVisible(node) {
    if (!node || node.closest(`#${PANEL_ID}`)) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function cleanUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      const nested = parsed.searchParams.get('url') || parsed.searchParams.get('target');
      if (nested && /^https?:\/\//i.test(nested)) return nested;

      parsed.hash = '';
      return parsed.href;
    } catch {
      return url || '';
    }
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./i, '');
    } catch {
      return '';
    }
  }

  function isYandexRedirectUrl(url) {
    try {
      const parsed = new URL(url);
      return /(^|\.)yabs\.yandex\./i.test(parsed.hostname)
        || (/^yandex\./i.test(parsed.hostname) && /\/an\/count\//i.test(parsed.pathname));
    } catch {
      return false;
    }
  }

  function normalizeDisplayUrl(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/[›»].*$/, '')
      .replace(/[.…]+$/g, '')
      .replace(/[?#].*$/, '')
      .replace(/\/$/, '');
  }

  function displayUrlToRealUrl(displayUrl) {
    const normalized = normalizeDisplayUrl(displayUrl);
    if (!normalized) return '';

    const host = normalized.split('/')[0];
    if (!/^[a-z0-9а-яё.-]+\.[a-zа-яё]{2,}(?::\d+)?$/i.test(host)) return '';

    return `https://${host}/`;
  }

  function getExportUrl(rawUrl, displayUrl) {
    const cleaned = cleanUrl(rawUrl);

    if (isYandexRedirectUrl(cleaned)) {
      return displayUrlToRealUrl(displayUrl) || cleaned;
    }

    return cleaned;
  }

  function normalizeUrlForKey(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'ysclid', 'from', 'etext'].forEach((key) => parsed.searchParams.delete(key));
      return parsed.href.toLowerCase().replace(/\/$/, '');
    } catch {
      return normalizeText(url).toLowerCase();
    }
  }

  function getStableTarget(row) {
    const display = normalizeDisplayUrl(row.displayUrl);
    if (row.isAd && display) return display;
    if (isYandexRedirectUrl(row.url) && display) return display;

    return normalizeUrlForKey(row.url || row.displayUrl || row.domain || '');
  }

  function makeRowKey(row) {
    return [
      normalizeText(row.query).toLowerCase(),
      row.isAd ? 'ad' : 'organic',
      getStableTarget(row),
      normalizeText(row.title).toLowerCase(),
    ].join('|');
  }

  function getAnchor(container, link) {
    const titleNode = container.querySelector([
      'h2', 'h3',
      '[class*="Title"]', '[class*="title"]',
      '[class*="OrganicTitle"]', '[class*="organic__title"]',
      '[role="heading"]',
    ].join(','));

    return normalizeText(titleNode?.innerText || link?.innerText || link?.textContent);
  }

  function getDescription(container) {
    const selectors = [
      '[class*="TextContainer"]',
      '[class*="text-container"]',
      '[class*="Snippet"]',
      '[class*="snippet"]',
      '[class*="Description"]',
      '[class*="description"]',
      '[class*="organic__text"]',
      '[class*="ExtendedText"]',
    ];

    const candidates = selectors.flatMap((selector) => [...container.querySelectorAll(selector)]);
    const texts = candidates
      .map((node) => normalizeText(node.innerText || node.textContent))
      .filter((text) => text && text.length > 20)
      .filter((text) => !/^(реклама|перейти|сохран[её]нная копия)$/i.test(text));

    return texts.sort((a, b) => b.length - a.length)[0] || '';
  }

  function getDisplayUrl(container, link) {
    const selectors = [
      '[class*="Path"]', '[class*="path"]',
      '[class*="Url"]', '[class*="url"]',
      '[class*="Link"] [class*="Text"]',
    ];

    for (const selector of selectors) {
      const node = container.querySelector(selector);
      const text = normalizeText(node?.innerText || node?.textContent);
      if (text && !/^https?:\/\//i.test(text) && text.length < 180) return text;
    }

    return getDomain(cleanUrl(link?.href || ''));
  }

  function isAdResult(container) {
    const text = normalizeText(container.innerText || container.textContent).toLowerCase();
    const cls = String(container.className || '').toLowerCase();

    return Boolean(
      /(^|\s)(реклама|ad|ads)(\s|$|[.:])/.test(text)
      || /direct|adv|advert|premium|commercial|serp-adv/.test(cls)
      || container.querySelector('[aria-label*="еклама" i], [title*="еклама" i], [class*="Ad"], [class*="ad"], [class*="Direct"], [class*="direct"]')
    );
  }

  function getBlockType(container, isAd) {
    const cls = String(container.className || '').toLowerCase();
    if (isAd) return 'ad';
    if (/video/.test(cls)) return 'video';
    if (/images|image/.test(cls)) return 'images';
    if (/map|maps|companies|business/.test(cls)) return 'maps';
    if (/organic/.test(cls)) return 'organic';
    return 'serp';
  }

  function findResultContainers() {
    const selectors = [
      'li.serp-item',
      '[class*="serp-item"]',
      '[data-cid]',
      '[class*="Organic"]',
      '[class*="organic"]',
      '[class*="SearchResult"]',
      '[class*="search-result"]',
      '[class*="Direct"]',
      '[class*="direct"]',
    ];

    const containers = new Set();
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (isVisible(node) && node.querySelector('a[href]')) containers.add(node);
      });
    });

    return [...containers].filter((node) => ![...containers].some((other) => other !== node && other.contains(node)));
  }

  function findMainLink(container) {
    const links = [...container.querySelectorAll('a[href]')]
      .filter(isVisible)
      .filter((link) => {
        const href = link.getAttribute('href') || '';
        const text = normalizeText(link.innerText || link.textContent);
        return href && !href.startsWith('#') && !/^javascript:/i.test(href) && (text.length > 1 || link.querySelector('h2,h3,[role="heading"]'));
      });

    return links.find((link) => link.closest('h2,h3,[role="heading"], [class*="Title"], [class*="title"]')) || links[0] || null;
  }

  function parseResult(container, position) {
    const link = findMainLink(container);
    if (!link) return null;

    const rawUrl = link.href || link.getAttribute('href');
    const displayUrl = getDisplayUrl(container, link);
    const url = getExportUrl(rawUrl, displayUrl);
    if (!/^https?:\/\//i.test(url)) return null;

    const query = getQuery();
    const isAd = isAdResult(container);
    const row = {
      query,
      position,
      isAd: isAd ? 1 : 0,
      blockType: getBlockType(container, isAd),
      title: getAnchor(container, link),
      url,
      domain: getDomain(url),
      displayUrl,
      description: getDescription(container),
      pageUrl: location.href,
    };

    if (!row.title && !row.description) return null;
    return row;
  }

  function addRow(row) {
    const key = makeRowKey(row);
    if (state.rows.has(key)) return false;
    state.rows.set(key, row);
    return true;
  }

  function collectFromDom() {
    const containers = findResultContainers();
    let added = 0;

    containers.forEach((container, index) => {
      const row = parseResult(container, index + 1);
      if (row && addRow(row)) added += 1;
    });

    if (added) {
      saveRows();
      setStatus(`Добавлено: ${added}`);
    } else {
      updatePanel();
    }
  }

  function scheduleCollect() {
    clearTimeout(state.collectTimer);
    state.collectTimer = setTimeout(collectFromDom, 500);
  }

  function toCsv() {
    const header = ['query', 'position', 'isAd', 'blockType', 'title', 'url', 'domain', 'displayUrl', 'description', 'pageUrl'];
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const body = [...state.rows.values()].map((row) => header.map((key) => escape(row[key])).join(';'));
    return [header.join(';'), ...body].join('\n');
  }

  async function copyCsv() {
    setStatus('Копирую CSV…');
    collectFromDom();

    try {
      const csv = toCsv();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(csv);
      } else if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(csv, 'text');
      } else {
        throw new Error('Clipboard API недоступен');
      }
      setStatus(`Скопировано строк: ${state.rows.size}`);
    } catch (error) {
      console.warn('[Yandex SERP Parser] copy failed', error);
      setStatus('Не удалось скопировать CSV');
    }
  }

  function clearRows() {
    if (!confirm('Очистить собранную выдачу?')) return;
    state.rows.clear();
    saveRows();
    setStatus('Очищено');
  }

  function setStatus(text) {
    state.status = text || '';
    updatePanel();
  }

  function makeButton(text, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.addEventListener('click', onClick);
    button.style.cssText = [
      'all:unset',
      'box-sizing:border-box',
      'display:inline-block',
      'padding:6px 8px',
      'border:1px solid #cfd6e4',
      'border-radius:6px',
      'background:#fff',
      'color:#111',
      'cursor:pointer',
      'font:12px Arial,sans-serif',
      'line-height:1.2',
      'text-align:center',
    ].join(';');
    return button;
  }

  function initPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = [
      'all:initial',
      'box-sizing:border-box',
      'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
      'width:260px', 'padding:12px', 'border:1px solid #d8dee9', 'border-radius:12px',
      'background:#fff', 'box-shadow:0 8px 30px rgba(0,0,0,.22)',
      'font:13px Arial,sans-serif', 'color:#111', 'line-height:1.35',
      'color-scheme:light',
    ].join(';');

    panel.innerHTML = '<b style="all:unset;display:block;font:700 13px Arial,sans-serif;color:#111">Yandex SERP Parser</b><div id="ysp-count" style="all:unset;display:block;margin:8px 0;color:#555;font:13px Arial,sans-serif"></div><div id="ysp-status" style="all:unset;display:block;margin:-4px 0 8px;color:#777;font:12px Arial,sans-serif"></div>';

    const buttons = document.createElement('div');
    buttons.style.cssText = 'all:unset;display:flex;flex-wrap:wrap;gap:6px;box-sizing:border-box';
    buttons.append(
      makeButton('Копировать', copyCsv),
      makeButton('Очистить', clearRows),
    );

    panel.appendChild(buttons);
    document.body.appendChild(panel);
    updatePanel();
  }

  function updatePanel() {
    const count = document.getElementById('ysp-count');
    if (count) count.textContent = `Собрано: ${state.rows.size}`;

    const status = document.getElementById('ysp-status');
    if (status) status.textContent = state.status || `Запрос: ${getQuery() || '—'}`;
  }

  function init() {
    initPanel();
    collectFromDom();

    const observer = new MutationObserver(scheduleCollect);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', scheduleCollect);
    window.addEventListener('hashchange', scheduleCollect);
    setInterval(scheduleCollect, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
