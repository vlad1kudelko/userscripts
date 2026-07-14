// ==UserScript==
// @name         Yandex Disk compact monospace list
// @namespace    https://disk.yandex.ru/
// @version      2026-07-14
// @description  Makes Yandex Disk file list more compact: monospace names/columns and ~30px file icons.
// @author       vlad1kudelko
// @match        https://disk.yandex.ru/*
// @match        https://disk.yandex.com/*
// @match        https://disk.yandex.kz/*
// @match        https://disk.yandex.by/*
// @match        https://disk.yandex.uz/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  const STYLE_ID = "yd-compact-monospace-list-style";

  const css = `
    :root {
      --yd-compact-icon-size: 30px;
      --yd-compact-row-height: 38px;
      --yd-compact-font: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace;
    }

    /* Моноширный шрифт только внутри списка файлов/папок */
    .listing__items[role="grid"] .listing-item,
    .listing__items[role="grid"] .listing-item__info,
    .listing__items[role="grid"] .listing-item__title,
    .listing__items[role="grid"] .listing-item__title .clamped-text,
    .listing__items[role="grid"] .listing-item__column {
      font-family: var(--yd-compact-font) !important;
      font-size: 13px !important;
      line-height: 16px !important;
      font-variant-ligatures: none !important;
    }

    /* Чуть компактнее строки, чтобы иконка 30px смотрелась естественно */
    .listing__items[role="grid"] .listing-item.listing-item_theme_row {
      min-height: var(--yd-compact-row-height) !important;
      height: var(--yd-compact-row-height) !important;
    }

    .listing__items[role="grid"] .listing-item__info,
    .listing__items[role="grid"] .listing-item__right {
      min-height: var(--yd-compact-row-height) !important;
      height: var(--yd-compact-row-height) !important;
    }

    /* Иконки файлов/папок: было около 40px, делаем около 30px */
    .listing__items[role="grid"] .listing-item__icon,
    .listing__items[role="grid"] .listing-item__icon_type_icon,
    .listing__items[role="grid"] .listing-item__icon_type_preview {
      width: var(--yd-compact-icon-size) !important;
      min-width: var(--yd-compact-icon-size) !important;
      height: var(--yd-compact-icon-size) !important;
      min-height: var(--yd-compact-icon-size) !important;
    }

    .listing__items[role="grid"] .listing-item__icon .file-icon,
    .listing__items[role="grid"] .listing-item__icon .resource-icon-preview,
    .listing__items[role="grid"] .listing-item__icon .resource-image,
    .listing__items[role="grid"] .resource-icon-preview_size_m,
    .listing__items[role="grid"] .file-icon_size_m {
      width: var(--yd-compact-icon-size) !important;
      min-width: var(--yd-compact-icon-size) !important;
      max-width: var(--yd-compact-icon-size) !important;
      height: var(--yd-compact-icon-size) !important;
      min-height: var(--yd-compact-icon-size) !important;
      max-height: var(--yd-compact-icon-size) !important;
      background-size: contain !important;
      object-fit: cover !important;
    }

    .listing__items[role="grid"] img.resource-icon-preview_img {
      border-radius: 6px !important;
    }
  `;

  const addStyle = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  };

  addStyle();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addStyle, { once: true });
  }
})();
