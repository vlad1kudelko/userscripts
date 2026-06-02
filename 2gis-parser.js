// ==UserScript==
// @name         2GIS Parser — сбор контактов
// @namespace    https://2gis.ru
// @version      4.0
// @description  Перехватывает /items, /items/byid и /markers/clustered. Собирает компании с телефонами в фоне. Кнопка "Скачать CSV" в левом нижнем углу.
// @author       you
// @match        https://2gis.ru/*
// @match        https://*.2gis.ru/*
// @match        https://2gis.kz/*
// @match        https://2gis.kg/*
// @match        https://2gis.uz/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // ─── Хранилище ───────────────────────────────────────────────────────────
  const collected = new Map(); // key = branchId, value = объект

  // ─── Парсинг contact_groups ──────────────────────────────────────────────
  function parseContacts(contactGroups) {
    const phones = [],
      emails = [],
      sites = [];
    (contactGroups || []).forEach((group) => {
      (group.contacts || []).forEach((c) => {
        if (
          (c.type === "phone" || c.type === "fax") &&
          c.value &&
          !phones.includes(c.value)
        )
          phones.push(c.value);
        else if (c.type === "email" && c.value && !emails.includes(c.value))
          emails.push(c.value);
        else if (
          (c.type === "website" || c.type === "url") &&
          c.value &&
          !sites.includes(c.value)
        )
          sites.push(c.value);
      });
    });
    return { phones, emails, sites };
  }

  // ─── Телефон из рекламного блока ads ─────────────────────────────────────
  function phonesFromAds(ads) {
    const phones = [];
    const actions = ads?.options?.actions || [];
    actions.forEach((a) => {
      if (a.type === "phone" && a.value && !phones.includes(a.value))
        phones.push(a.value);
    });
    return phones;
  }

  // ─── Формат расписания ───────────────────────────────────────────────────
  function formatSchedule(schedule) {
    if (!schedule) return "";
    if (schedule.is_24x7) return "Круглосуточно";
    const dayMap = {
      Mon: "Пн",
      Tue: "Вт",
      Wed: "Ср",
      Thu: "Чт",
      Fri: "Пт",
      Sat: "Сб",
      Sun: "Вс",
    };
    const parts = [];
    for (const [key, label] of Object.entries(dayMap)) {
      const wh = schedule[key]?.working_hours;
      if (wh?.length) {
        const times = wh.map((h) => `${h.from}–${h.to}`).join(", ");
        parts.push(`${label} ${times}`);
      }
    }
    const unique = [...new Set(parts.map((p) => p.replace(/^\S+\s/, "")))];
    let result =
      unique.length === 1 ? `Ежедневно ${unique[0]}` : parts.join(", ");
    if (schedule.comment) result += ` (${schedule.comment})`;
    return result;
  }

  // ─── Извлечение из полного item (/items, /items/byid) ────────────────────
  function extractFullItem(item) {
    if (!item || item.type !== "branch") return null;
    const name = item.name || item.name_ex?.primary || "";
    if (!name) return null;

    const rawId = String(item.id || "");
    const branchId = rawId.split("_")[0];
    if (!branchId) return null;
    const orgId = item.org?.id || branchId;

    const address =
      item.address_name ||
      (() => {
        return (item.address?.components || [])
          .map((c) => {
            if (c.type === "street_number")
              return `${c.street || ""} ${c.number || ""}`.trim();
            if (c.type === "location") return c.comment || "";
            return c.value || "";
          })
          .filter(Boolean)
          .join(", ");
      })();

    const city =
      item.city_alias ||
      (item.adm_div || []).find((d) => d.type === "city")?.name ||
      "";
    const region =
      (item.adm_div || []).find((d) => d.type === "region")?.name || "";

    const rubrics =
      (item.rubrics || [])
        .filter((r) => r.kind === "primary")
        .map((r) => r.name)
        .join("; ") || (item.rubrics || []).map((r) => r.name).join("; ");

    const rating = item.reviews?.general_rating ?? "";
    const reviewsCount = item.reviews?.general_review_count ?? "";
    const schedule = formatSchedule(item.schedule);
    const branchCount = item.org?.branch_count ?? 1;
    const url = `https://2gis.ru/firm/${branchId}`;

    const { phones, emails, sites } = parseContacts(item.contact_groups);
    phonesFromAds(item.ads).forEach((p) => {
      if (!phones.includes(p)) phones.push(p);
    });

    return {
      branchId,
      orgId,
      name,
      address,
      city,
      region,
      rubrics,
      rating,
      reviewsCount,
      schedule,
      branchCount,
      url,
      phones,
      emails,
      sites,
    };
  }

  // ─── Извлечение из маркерного item (/markers/clustered) ──────────────────
  function extractMarkerItem(item) {
    if (!item || item.type !== "branch") return null;
    const name = item.name || item.name_ex?.primary || "";
    if (!name) return null;

    const rawId = String(item.id || "");
    const branchId = rawId.split("_")[0];
    if (!branchId) return null;

    const rating = item.reviews?.general_rating ?? "";
    const reviewsCount = item.reviews?.general_review_count ?? "";
    const schedule = formatSchedule(item.schedule);
    const url = `https://2gis.ru/firm/${branchId}`;
    const phones = phonesFromAds(item.ads);

    return {
      branchId,
      orgId: branchId,
      name,
      address: "",
      city: "",
      region: "",
      rubrics: "",
      rating,
      reviewsCount,
      schedule,
      branchCount: 1,
      url,
      phones,
      emails: [],
      sites: [],
    };
  }

  // ─── Слияние двух записей: enriched обновляет base ───────────────────────
  function mergeInto(base, update) {
    // Телефоны — объединяем уникальные
    update.phones.forEach((p) => {
      if (!base.phones.includes(p)) base.phones.push(p);
    });
    update.emails.forEach((e) => {
      if (!base.emails.includes(e)) base.emails.push(e);
    });
    update.sites.forEach((s) => {
      if (!base.sites.includes(s)) base.sites.push(s);
    });
    // Заполняем пустые поля
    if (!base.address && update.address) base.address = update.address;
    if (!base.city && update.city) base.city = update.city;
    if (!base.region && update.region) base.region = update.region;
    if (!base.rubrics && update.rubrics) base.rubrics = update.rubrics;
    if (!base.rating && update.rating) base.rating = update.rating;
    if (!base.reviewsCount && update.reviewsCount)
      base.reviewsCount = update.reviewsCount;
    if (!base.schedule && update.schedule) base.schedule = update.schedule;
    if (update.branchCount > base.branchCount)
      base.branchCount = update.branchCount;
  }

  // ─── Обработка массива items ─────────────────────────────────────────────
  function processItems(items, isMarker) {
    let added = 0,
      updated = 0;
    (items || []).forEach((item) => {
      const parsed = isMarker ? extractMarkerItem(item) : extractFullItem(item);
      if (!parsed) return;

      if (!collected.has(parsed.branchId)) {
        collected.set(parsed.branchId, parsed);
        added++;
      } else {
        mergeInto(collected.get(parsed.branchId), parsed);
        updated++;
      }
    });
    if (added > 0 || updated > 0) updateCounter();
  }

  // ─── Обработка ответа ────────────────────────────────────────────────────
  function processResponse(data, url) {
    try {
      const isMarker = url.includes("/markers/");
      const items = data?.result?.items || data?.items || [];
      processItems(items, isMarker);
    } catch (e) {}
  }

  // ─── Патч fetch ──────────────────────────────────────────────────────────
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const res = await origFetch.apply(this, args);
    if (isTargetUrl(url)) {
      res
        .clone()
        .json()
        .then((data) => processResponse(data, url))
        .catch(() => {});
    }
    return res;
  };

  // ─── Патч XHR ────────────────────────────────────────────────────────────
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._2gisUrl = url;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (isTargetUrl(this._2gisUrl || "")) {
      const _url = this._2gisUrl;
      this.addEventListener("load", function () {
        try {
          processResponse(JSON.parse(this.responseText), _url);
        } catch (e) {}
      });
    }
    return origSend.apply(this, args);
  };

  // ─── Фильтр URL ──────────────────────────────────────────────────────────
  function isTargetUrl(url) {
    return url.includes("catalog.api.2gis") || url.includes("api.2gis");
  }

  // ─── UI ──────────────────────────────────────────────────────────────────
  function createUI() {
    if (document.getElementById("__2gp")) return;
    const style = document.createElement("style");
    style.textContent = `
            #__2gp {
                position:fixed; bottom:20px; left:20px; z-index:999999;
                display:flex; flex-direction:column; gap:6px; align-items:flex-start;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
            }
            #__2gp_cnt {
                background:#1558d6; color:#fff;
                padding:5px 14px; border-radius:20px;
                font-size:13px; font-weight:600;
                box-shadow:0 2px 8px rgba(0,0,0,.3);
                pointer-events:none; transition:transform .15s ease;
            }
            #__2gp_cnt.bump { transform:scale(1.18); }
            #__2gp_dl {
                background:#27ae60; color:#fff; border:none;
                padding:7px 15px; border-radius:8px;
                font-size:13px; font-weight:600; cursor:pointer;
                box-shadow:0 2px 8px rgba(0,0,0,.2); transition:background .2s;
            }
            #__2gp_dl:hover { background:#219a52; }
            #__2gp_clr {
                background:rgba(0,0,0,.5); color:#fff; border:none;
                padding:4px 11px; border-radius:7px;
                font-size:12px; cursor:pointer;
            }
            #__2gp_clr:hover { background:rgba(0,0,0,.7); }
        `;
    document.head.appendChild(style);
    const panel = document.createElement("div");
    panel.id = "__2gp";
    panel.innerHTML = `
            <div id="__2gp_cnt">📍 0 компаний</div>
            <button id="__2gp_dl">⬇ Скачать CSV</button>
            <button id="__2gp_clr">🗑 Очистить</button>
        `;
    document.body.appendChild(panel);
    document.getElementById("__2gp_dl").addEventListener("click", downloadCSV);
    document.getElementById("__2gp_clr").addEventListener("click", () => {
      collected.clear();
      updateCounter();
    });
  }

  function updateCounter() {
    const el = document.getElementById("__2gp_cnt");
    if (!el) return;
    const withPhone = [...collected.values()].filter(
      (v) => v.phones.length > 0,
    ).length;
    el.textContent = `📍 ${collected.size} компаний${withPhone ? ` (☎ ${withPhone})` : ""}`;
    el.classList.add("bump");
    setTimeout(() => el.classList.remove("bump"), 200);
  }

  // ─── CSV ─────────────────────────────────────────────────────────────────
  function downloadCSV() {
    if (collected.size === 0) {
      alert(
        "Ничего не собрано. Листайте карту и открывайте карточки компаний.",
      );
      return;
    }
    const headers = [
      "Ссылка",
      "Регион",
      "Город",
      "Название",
      "Адрес",
      "Рубрика",
      "Телефоны",
      "Email",
      "Сайты",
      "Рейтинг",
      "Отзывов",
      "Режим работы",
      "Филиалов",
    ];
    const rows = [headers];
    collected.forEach((item) => {
      rows.push(
        [
          item.url,
          item.region,
          item.city,
          item.name,
          item.address,
          item.rubrics,
          item.phones.join(", "),
          item.emails.join(", "),
          item.sites.join(", "),
          item.rating,
          item.reviewsCount,
          item.schedule,
          item.branchCount,
        ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`),
      );
    });
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `2gis_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ─── Старт ───────────────────────────────────────────────────────────────
  const initUI = () => {
    if (document.body) createUI();
    else setTimeout(initUI, 300);
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initUI);
  else initUI();
})();
