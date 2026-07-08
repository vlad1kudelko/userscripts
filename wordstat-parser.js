// ==UserScript==
// @name         Wordstat Parser
// @namespace    https://wordstat.yandex.ru/
// @version      0.6.0
// @description  Собирает ключевые фразы и частотность из Яндекс Wordstat одним запросом API getAllTableData и копирует результат в буфер.
// @author       you
// @match        https://wordstat.yandex.ru/*
// @match        https://wordstat.yandex.*/*
// @run-at       document-start
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'wkc_rows_v1';
  const API_URL = '/wordstat/api/getAllTableData';
  const TABLE_TYPE = 'popular'; // Ответ содержит сразу payload.popular и payload.associations.
  const CURRENT_DEVICE = 'desktop,phone,tablet';

  const PHRASE_KEYS = ['text', 'phrase', 'phrases', 'query', 'queries', 'keyword', 'keywordText', 'word', 'words', 'request', 'name', 'title'];
  const VALUE_KEYS = ['count', 'cnt', 'shows', 'showCount', 'showsCount', 'absoluteValue', 'frequency', 'freq', 'hits', 'impressions', 'value', 'number', 'total'];
  const HEADER_RX = /^(фраз|запрос|слово|показ|частот|keyword|phrase|query|text|count|shows|frequency|value)$/i;
  const SERVICE_PHRASE_RX = /^(популярные|похожие|запросы|запросы\s+со|показов|слова|все|desktop|mobile|phone|tablet)$/i;

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

  function normalizeRow(phrase, value) {
    const normalizedPhrase = normalizeText(phrase);
    const normalizedValue = normalizeValue(value);

    if (!normalizedPhrase || normalizedPhrase.length < 2) return null;
    if (normalizedValue === '') return null;
    if (SERVICE_PHRASE_RX.test(normalizedPhrase)) return null;

    const key = normalizedPhrase.toLowerCase();
    return {
      key,
      recordKey: `${key}\t${normalizedValue}`,
      phrase: normalizedPhrase,
      value: normalizedValue,
    };
  }

  function createStats() {
    return {
      downloaded: 0,
      added: 0,
      total: state.rows.size,
      seen: new Set(),
    };
  }

  function addRow(stats, phrase, value) {
    const row = normalizeRow(phrase, value);
    if (!row) return;

    if (!stats.seen.has(row.recordKey)) {
      stats.seen.add(row.recordKey);
      stats.downloaded += 1;
    }

    if (!state.rows.has(row.key)) stats.added += 1;
    state.rows.set(row.key, { phrase: row.phrase, value: row.value });
    stats.total = state.rows.size;
  }

  function pickString(obj, keys) {
    for (const key of keys) {
      const value = obj?.[key];
      if (typeof value === 'string' && normalizeText(value)) return value;
      if (Array.isArray(value)) {
        const nested = value.find((item) => typeof item === 'string' && normalizeText(item) && normalizeValue(item) === '');
        if (nested) return nested;
      }
      if (value && typeof value === 'object') {
        const nested = value.text || value.value || value.name || value.title || value.words || value.phrase || value.query;
        if (typeof nested === 'string' && normalizeText(nested)) return nested;
      }
    }
    return '';
  }

  function pickValue(obj, keys) {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && normalizeValue(value) !== '') return value;
    }
    return '';
  }

  function collectArrayRow(value, stats) {
    if (value.length < 2) return;

    const scalarCells = value
      .filter((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item))
      .map((item) => normalizeText(item));

    const phraseFromCells = scalarCells.find((cell) => cell && normalizeValue(cell) === '' && !HEADER_RX.test(cell));
    const countFromCells = scalarCells.find((cell) => normalizeValue(cell) !== '');
    const phrase = phraseFromCells || (typeof value[0] === 'string' ? value[0] : pickString(value[0], PHRASE_KEYS));
    const count = countFromCells || (normalizeValue(value[1]) !== '' ? value[1] : pickValue(value[0], VALUE_KEYS));

    addRow(stats, phrase, count);
  }

  function collectJsonRows(value, stats, depth = 0) {
    if (!value || depth > 10) return;

    if (Array.isArray(value)) {
      collectArrayRow(value, stats);
      value.forEach((item) => collectJsonRows(item, stats, depth + 1));
      return;
    }

    if (typeof value !== 'object') return;

    addRow(stats, pickString(value, PHRASE_KEYS), pickValue(value, VALUE_KEYS));

    Object.entries(value).forEach(([key, item]) => {
      if ((/\s/.test(key) || /[а-яё]/i.test(key)) && normalizeValue(item) !== '') addRow(stats, key, item);
      collectJsonRows(item, stats, depth + 1);
    });
  }

  function collectApiPayload(payload) {
    const stats = createStats();
    collectJsonRows(payload, stats);
    delete stats.seen;
    saveRows();
    updatePanel();
    return stats;
  }

  function getSearchValue() {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('words') || params.get('text') || params.get('query') || params.get('q');
    if (fromUrl) return normalizeText(fromUrl);

    const input = document.querySelector('input[name="words"], input[name="text"], input[type="search"], textarea');
    return normalizeText(input?.value || '');
  }

  function getWordstatRegion() {
    return new URLSearchParams(location.search).get('region') || 'all';
  }

  function getWordstatDbName() {
    return new URLSearchParams(location.search).get('dbname') || 'rus';
  }

  async function fetchWordstatData() {
    const searchValue = getSearchValue();
    if (!searchValue) throw new Error('Не найден поисковый запрос Wordstat');

    const body = {
      currentDevice: CURRENT_DEVICE,
      dbname: getWordstatDbName(),
      filters: {
        region: getWordstatRegion(),
        tableType: TABLE_TYPE,
      },
      searchValue,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`getAllTableData: HTTP ${response.status}`);

    const stats = collectApiPayload(await response.json());
    setStatus(`getAllTableData\nСкачано записей: ${stats.downloaded}\nНовых: ${stats.added}\nВсего: ${stats.total}`);
    return stats;
  }

  function toCsv() {
    const header = ['phrase', 'value'];
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const body = [...state.rows.values()]
      .filter((row) => row.phrase && row.value !== '')
      .map((row) => header.map((key) => escape(row[key])).join(';'));

    return [header.join(';'), ...body].join('\n');
  }

  async function copyCsv() {
    setStatus('Готовлю CSV для копирования…');
    const csv = toCsv();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(csv);
      } else if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(csv, 'text');
      } else {
        throw new Error('Clipboard API недоступен');
      }
      setStatus(`Скопировано строк: ${state.rows.size}`);
    } catch {
      setStatus('Не удалось скопировать CSV');
    }
  }

  async function collectAllData() {
    if (state.loading) return;

    state.loading = true;
    updatePanel();

    const before = state.rows.size;

    try {
      setStatus('Запрашиваю API Яндекса…');
      await fetchWordstatData();
      await copyCsv();
      setStatus(`API Яндекса скопирован\nНовых строк: ${state.rows.size - before}\nВсего: ${state.rows.size}`);
    } catch (error) {
      setStatus(error?.message || 'Не удалось получить данные через API Яндекса');
    } finally {
      state.loading = false;
      updatePanel();
    }
  }

  function clearRows() {
    if (!confirm('Очистить собранные ключи?')) return;
    state.rows.clear();
    saveRows();
    updatePanel();
  }

  function setStatus(text) {
    state.status = text || '';
    updatePanel();
  }

  function makeButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.type = 'button';
    button.addEventListener('click', onClick);
    button.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;';
    return button;
  }

  function initPanel() {
    if (document.getElementById('wkc-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'wkc-panel';
    panel.style.cssText = [
      'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
      'width:250px', 'padding:12px', 'border:1px solid #ddd', 'border-radius:12px',
      'background:#fff', 'box-shadow:0 8px 30px rgba(0,0,0,.18)',
      'font:13px Arial,sans-serif', 'color:#111',
    ].join(';');

    panel.innerHTML = '<b>Wordstat Collector</b><div id="wkc-count" style="margin:8px 0;color:#555"></div><div id="wkc-status" style="margin:-4px 0 8px;color:#777;font-size:12px;white-space:pre-line"></div>';

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    buttons.append(
      makeButton('API все данные', collectAllData),
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
    if (!panel) return;

    [...panel.querySelectorAll('button')].forEach((button) => {
      button.disabled = state.loading && button.textContent !== 'Очистить';
    });
  }

  window.addEventListener('DOMContentLoaded', initPanel);
})();
