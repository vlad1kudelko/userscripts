// ==UserScript==
// @name         Wordstat Parser
// @namespace    https://wordstat.yandex.ru/
// @version      0.3.1
// @description  Собирает ключевые фразы и частотность из Яндекс Wordstat, нажимает «Показать ещё», умеет вкладку «Похожие».
// @author       you
// @match        https://wordstat.yandex.ru/*
// @match        https://wordstat.yandex.*/*
// @run-at       document-start
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'wkc_rows_v1';
  const state = {
    rows: loadRows(),
    loading: false,
    status: '',
  };

  function loadRows() {
    try {
      return new Map(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
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

  function normalizeValue(value) {
    const raw = normalizeText(value).replace(/[^\d]/g, '');
    return raw ? Number(raw) : '';
  }

  function addRow(phrase, value = '', source = 'page') {
    phrase = normalizeText(phrase);
    const numericValue = normalizeValue(value);

    if (!phrase || phrase.length < 2) return false;
    // Не сохраняем заголовки/элементы интерфейса и строки без частотности.
    if (numericValue === '') return false;
    if (/^(популярные|похожие|запросы|запросы\s+со|показов|слова|все|desktop|mobile|phone|tablet)$/i.test(phrase)) return false;

    const key = phrase.toLowerCase();
    const old = state.rows.get(key);
    const row = {
      phrase,
      value: numericValue,
      source: old?.source || source,
      addedAt: old?.addedAt || new Date().toISOString(),
    };
    state.rows.set(key, row);
    return !old;
  }

  function parseRowText(text) {
    const normalized = normalizeText(text);
    if (!normalized) return null;

    // Частый вариант: «ключевая фраза 12 345».
    const oneLine = normalized.match(/^(.+?)\s+([\d\s.,]{1,20})$/);
    if (oneLine) {
      return { phrase: oneLine[1], value: oneLine[2] };
    }

    const lines = String(text || '')
      .split('\n')
      .map(normalizeText)
      .filter(Boolean);

    const valueLine = [...lines].reverse().find((line) => /^[\d\s.,]+$/.test(line));
    const phraseLine = lines.find((line) => !/^[\d\s.,]+$/.test(line));

    if (!phraseLine) return null;
    return { phrase: phraseLine, value: valueLine || '' };
  }

  function collectFromDom() {
    let added = 0;
    const selectors = [
      'tr',
      '[role="row"]',
      '[class*="table"] [class*="row"]',
      '[class*="Table"] [class*="Row"]',
      '[class*="wordstat"] [class*="row"]',
      '[class*="wordstat"] [class*="item"]',
    ];

    const nodes = new Set();
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!node.closest('#wkc-panel')) nodes.add(node);
      });
    });

    nodes.forEach((node) => {
      const parsed = parseRowText(node.innerText || node.textContent);
      if (parsed && addRow(parsed.phrase, parsed.value, 'dom')) added += 1;
    });

    if (added) saveRows();
    updatePanel();
    return added;
  }

  function walkJson(value, visitor, depth = 0) {
    if (!value || depth > 8) return;
    if (Array.isArray(value)) {
      value.forEach((item) => walkJson(item, visitor, depth + 1));
      return;
    }
    if (typeof value !== 'object') return;
    visitor(value);
    Object.values(value).forEach((item) => walkJson(item, visitor, depth + 1));
  }

  function collectFromJson(json) {
    let added = 0;
    walkJson(json, (obj) => {
      const phrase = obj.text || obj.phrase || obj.query || obj.keyword || obj.word;
      const value = obj.value || obj.count || obj.shows || obj.absoluteValue || obj.frequency;
      if (typeof phrase === 'string' && addRow(phrase, value, 'api')) added += 1;
    });
    if (added) {
      saveRows();
      updatePanel();
    }
  }

  // Пассивно слушаем ответы приложения. Не обходим капчи и лимиты, просто забираем данные,
  // которые сама страница уже получила для текущего пользователя.
  function patchFetch() {
    const originalFetch = window.fetch;
    if (!originalFetch) return;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const clone = response.clone();
        const type = clone.headers.get('content-type') || '';
        if (type.includes('json')) clone.json().then(collectFromJson).catch(() => {});
      } catch {}
      return response;
    };
  }

  function patchXhr() {
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.__wkcUrl = url;
      return open.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener('load', function () {
        try {
          const contentType = this.getResponseHeader('content-type') || '';
          if (!contentType.includes('json')) return;
          collectFromJson(JSON.parse(this.responseText));
        } catch {}
      });
      return send.apply(this, args);
    };
  }

  function toCsv() {
    // В результате оставляем только то, что нужно для работы: ключ и частотность.
    const header = ['phrase', 'value'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [...state.rows.values()].filter((row) => row.phrase && row.value !== '');
    const body = rows.map((row) => header.map((key) => escape(row[key])).join(';'));
    return [header.join(';'), ...body].join('\n');
  }

  async function copyCsv() {
    setStatus('Готовлю CSV для копирования…');
    const csv = toCsv();

    try {
      // navigator.clipboard обычно меньше подвешивает страницу, чем синхронный GM_setClipboard.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(csv);
      } else if (typeof GM_setClipboard === 'function') {
        await new Promise((resolve) => setTimeout(resolve, 0));
        GM_setClipboard(csv, 'text');
      } else {
        throw new Error('Clipboard API недоступен');
      }
      setStatus(`Скопировано строк: ${state.rows.size}`);
    } catch (error) {
      console.warn('[Wordstat Collector] copy failed', error);
      setStatus('Не удалось скопировать CSV');
    }
  }

  function clearRows() {
    if (!confirm('Очистить собранные ключи?')) return;
    state.rows.clear();
    saveRows();
    updatePanel();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isVisible(node) {
    if (!node || node.closest('#wkc-panel')) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function setStatus(text) {
    state.status = text || '';
    updatePanel();
  }

  function getAccessibleText(node) {
    if (!node) return '';
    return normalizeText([
      node.innerText,
      node.textContent,
      node.getAttribute?.('aria-label'),
      node.getAttribute?.('title'),
      node.getAttribute?.('data-testid'),
      node.value,
    ].filter(Boolean).join(' '));
  }

  function isDisabled(node) {
    return Boolean(
      node?.disabled
      || node?.closest?.('[disabled], [aria-disabled="true"]')
      || node?.getAttribute?.('aria-disabled') === 'true'
    );
  }

  function closestClickable(node) {
    return node?.closest?.('button, a, label, input, [role="button"], [role="tab"], [role="link"], [role="menuitem"], [tabindex]:not([tabindex="-1"])');
  }

  function findClickableByText(pattern) {
    // В новом Wordstat подписи вкладок/кнопок часто лежат во вложенных span
    // или доступны только через aria-label/title, поэтому ищем и по кликабельным
    // элементам, и по их видимым дочерним элементам.
    const directSelector = 'button, a, label, input, [role="button"], [role="tab"], [role="link"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';
    const candidates = new Set([...document.querySelectorAll(directSelector)]);

    document.querySelectorAll('body *').forEach((node) => {
      if (node.closest('#wkc-panel') || !isVisible(node)) return;
      const text = getAccessibleText(node);
      if (!text || text.length > 160 || !pattern.test(text)) return;
      const clickable = closestClickable(node) || node;
      candidates.add(clickable);
    });

    return [...candidates].find((node) => {
      const text = getAccessibleText(node);
      return isVisible(node) && pattern.test(text) && !isDisabled(node);
    });
  }

  function clickElement(node) {
    node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
    node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    node.click();
  }

  async function waitForTableChange(prevCount, timeout = 12000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      collectFromDom();
      if (state.rows.size > prevCount) return true;
      if (!document.querySelector('#spin .spin2_progress_yes, [class*="spin"][class*="progress"], [aria-busy="true"]')) {
        await sleep(350);
        collectFromDom();
        if (state.rows.size > prevCount) return true;
      }
      await sleep(500);
    }
    return false;
  }

  async function clickLoadMoreAll(options = {}) {
    if (state.loading) return;
    state.loading = true;
    updatePanel();

    const maxClicks = options.maxClicks ?? 50;
    const delay = options.delay ?? 900;
    let clicks = 0;

    try {
      collectFromDom();
      while (clicks < maxClicks) {
        const button = findClickableByText(/^(показать\s+(ещ[её]|больше)|загрузить\s+(ещ[её]|больше))/i);
        if (!button) break;

        const before = state.rows.size;
        setStatus(`Жму «Показать ещё» ${clicks + 1}/${maxClicks}…`);
        button.scrollIntoView({ block: 'center', behavior: 'smooth' });
        await sleep(250);
        clickElement(button);
        clicks += 1;

        await waitForTableChange(before);
        await sleep(delay);
      }
      collectFromDom();
      setStatus(`Готово. Нажатий: ${clicks}`);
    } finally {
      state.loading = false;
      updatePanel();
    }
  }

  function findContentTab(value, textPattern) {
    const input = document.querySelector(`input[type="radio"][value="${value}"], input#${value}`);
    if (input) {
      const label = input.closest('label') || input;
      if (isVisible(label) && !isDisabled(label)) return label;
    }

    return [...document.querySelectorAll('.RadioButton-Radio, label')].find((node) => {
      const hasInput = node.querySelector?.(`input[value="${value}"], input#${value}`);
      return isVisible(node) && !isDisabled(node) && (hasInput || textPattern.test(getAccessibleText(node)));
    }) || findClickableByText(textPattern);
  }

  function getActiveContentType() {
    const checked = document.querySelector('input[type="radio"][name][value]:checked');
    return checked?.value || '';
  }

  async function openContentTab(value, title, textPattern) {
    if (getActiveContentType() === value) return true;

    const tab = findContentTab(value, textPattern);
    if (!tab) return false;

    setStatus(`Открываю вкладку «${title}»…`);
    tab.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await sleep(200);
    clickElement(tab);

    const started = Date.now();
    while (Date.now() - started < 10000) {
      await sleep(400);
      collectFromDom();
      if (getActiveContentType() === value) return true;
    }
    return getActiveContentType() === value;
  }

  function openPopularTab() {
    return openContentTab('popular', 'Популярные', /^популярные$/i);
  }

  function openSimilarTab() {
    return openContentTab('associations', 'Похожие', /^(похожие|похожие\s+запросы|запросы,?\s+похожие)(\b|\s|$)/i);
  }

  async function collectBothTabs() {
    const startedOnSimilar = getActiveContentType() === 'associations';

    await clickLoadMoreAll();

    const opened = startedOnSimilar
      ? await openPopularTab()
      : await openSimilarTab();

    if (!opened) {
      setStatus(startedOnSimilar ? 'Вкладка «Популярные» не найдена' : 'Вкладка «Похожие» не найдена');
      return;
    }

    await clickLoadMoreAll();
  }

  function makeButton(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.type = 'button';
    btn.addEventListener('click', onClick);
    btn.style.cssText = 'padding:6px 8px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;';
    return btn;
  }

  function initPanel() {
    if (document.getElementById('wkc-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'wkc-panel';
    panel.style.cssText = [
      'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
      'width:250px', 'padding:12px', 'border:1px solid #ddd', 'border-radius:12px',
      'background:#fff', 'box-shadow:0 8px 30px rgba(0,0,0,.18)',
      'font:13px Arial,sans-serif', 'color:#111'
    ].join(';');

    panel.innerHTML = '<b>Wordstat Collector</b><div id="wkc-count" style="margin:8px 0;color:#555"></div><div id="wkc-status" style="margin:-4px 0 8px;color:#777;font-size:12px"></div>';
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
    buttons.append(
      makeButton('Обе вкладки', collectBothTabs),
      makeButton('Копировать', copyCsv),
      makeButton('Очистить', clearRows),
    );
    panel.appendChild(buttons);
    document.body.appendChild(panel);
    updatePanel();
  }

  function updatePanel() {
    const count = document.getElementById('wkc-count');
    if (count) count.textContent = `Собрано: ${state.rows.size}${state.loading ? ' · загрузка…' : ''}`;
    const status = document.getElementById('wkc-status');
    if (status) status.textContent = state.status;
    const panel = document.getElementById('wkc-panel');
    if (panel) {
      [...panel.querySelectorAll('button')].forEach((button) => {
        const isLongAction = /^(Обе вкладки)$/.test(button.textContent);
        if (isLongAction) button.disabled = state.loading;
      });
    }
  }

  patchFetch();
  patchXhr();

  window.addEventListener('DOMContentLoaded', () => {
    initPanel();
    collectFromDom();
  });
})();
