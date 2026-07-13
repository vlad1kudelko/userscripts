// ==UserScript==
// @name         Kwork collapse project cards
// @namespace    https://kwork.ru/
// @version      2026-07-13
// @description  Adds a compact collapse/expand button to Kwork project cards and remembers collapsed cards.
// @author       vlad1kudelko
// @match        *://kwork.ru/projects*
// @match        *://www.kwork.ru/projects*
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  const STORAGE_KEY = "kwork_collapsed_want_cards_v1";
  const CARD_SELECTOR = ".want-card";
  const CARD_LINK_SELECTOR = 'a[href^="/projects/"]';
  const BUTTON_CLASS = "kw-collapse-card-btn";
  const TITLE_CLASS = "kw-collapse-card-title";
  const COLLAPSED_CLASS = "kw-collapse-card--collapsed";

  const BUTTON_SIZE = 28;
  const BUTTON_GAP = 6;

  const loadCollapsedIds = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return new Set(Array.isArray(value) ? value : []);
    } catch (_) {
      return new Set();
    }
  };

  const collapsedIds = loadCollapsedIds();

  const saveCollapsedIds = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsedIds]));
  };

  const getCardId = (card) => {
    const link = card.querySelector(CARD_LINK_SELECTOR);
    const href = link?.getAttribute("href") || "";
    const id = href.match(/\/projects\/(\d+)/)?.[1];
    return id || href || card.textContent.trim().slice(0, 80);
  };

  const getCardTitle = (card) => {
    const link = card.querySelector(CARD_LINK_SELECTOR);
    return link?.textContent.trim() || "Без названия";
  };

  const setCollapsed = (card, button, collapsed) => {
    const id = getCardId(card);

    card.classList.toggle(COLLAPSED_CLASS, collapsed);
    button.textContent = collapsed ? "+" : "−";
    button.title = collapsed ? "Развернуть карточку" : "Свернуть карточку";
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-expanded", String(!collapsed));

    if (collapsed) {
      collapsedIds.add(id);
    } else {
      collapsedIds.delete(id);
    }

    saveCollapsedIds();
  };

  const processCard = (card) => {
    const id = getCardId(card);
    let button = card.querySelector(`:scope > .${BUTTON_CLASS}`);
    let title = card.querySelector(`:scope > .${TITLE_CLASS}`);

    if (!title) {
      title = document.createElement("div");
      title.className = TITLE_CLASS;
      card.prepend(title);
    }
    title.textContent = getCardTitle(card);
    title.title = title.textContent;

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = BUTTON_CLASS;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCollapsed(card, button, !card.classList.contains(COLLAPSED_CLASS));
      });

      card.prepend(button);
    }

    setCollapsed(card, button, collapsedIds.has(id));
  };

  const processCards = () => {
    document.querySelectorAll(CARD_SELECTOR).forEach(processCard);
  };

  const addStyles = () => {
    if (document.getElementById("kw-collapse-card-styles")) return;

    const style = document.createElement("style");
    style.id = "kw-collapse-card-styles";
    style.textContent = `
      ${CARD_SELECTOR} {
        position: relative !important;
      }

      .${BUTTON_CLASS} {
        position: absolute;
        top: 0;
        right: -${BUTTON_SIZE + BUTTON_GAP}px;
        z-index: 20;
        width: ${BUTTON_SIZE}px;
        height: ${BUTTON_SIZE}px;
        min-width: ${BUTTON_SIZE}px;
        padding: 0;
        border: 1px solid #d7d7d7;
        border-radius: 4px;
        background: #fff;
        color: #666;
        cursor: pointer;
        font: 700 18px/${BUTTON_SIZE - 2}px Arial, sans-serif;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      }

      .${BUTTON_CLASS}:hover {
        border-color: #00b22d;
        color: #00b22d;
      }

      .${TITLE_CLASS} {
        display: none;
      }

      .${COLLAPSED_CLASS} > .${TITLE_CLASS} {
        display: block;
        position: absolute;
        left: 8px;
        right: 8px;
        top: 0;
        height: ${BUTTON_SIZE}px;
        overflow: hidden;
        color: #333;
        font: 600 12px/${BUTTON_SIZE}px Arial, sans-serif;
        white-space: nowrap;
        text-overflow: ellipsis;
        pointer-events: none;
      }

      .${COLLAPSED_CLASS} {
        height: ${BUTTON_SIZE}px !important;
        min-height: ${BUTTON_SIZE}px !important;
        max-height: ${BUTTON_SIZE}px !important;
        overflow: visible !important;
        box-sizing: border-box !important;
        opacity: 0.72;
      }

      .${COLLAPSED_CLASS} > :not(.${BUTTON_CLASS}):not(.${TITLE_CLASS}) {
        display: none !important;
      }
    `;

    document.head.append(style);
  };

  const debounce = (fn, delay = 100) => {
    let timer = null;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  };

  addStyles();
  processCards();

  const observer = new MutationObserver(debounce(processCards));
  observer.observe(document.body, { childList: true, subtree: true });
})();
