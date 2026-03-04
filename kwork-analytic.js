// ==UserScript==
// @name         Kwork analytic
// @version      2026-03-04
// @description  Kwork analytic
// @author       vlad1kudelko
// @match        *://kwork.ru/manage_kworks*
// @grant        none
// ==/UserScript==

(() => {
    'use strict';
    const var_stat_name = 'kworkanalytic__var_stat';
    const var_stat = JSON.parse(localStorage.getItem(var_stat_name) || '{}');
    const now = new Date();

    const getValueNDaysAgo = (history, days) => {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() - days);
        const targetStr = targetDate.toISOString().slice(0, 10);
        let bestValue = null;
        let closestDate = "";
        for (const [val, date] of Object.entries(history)) {
            if (date >= targetStr && date < closestDate) {
                closestDate = date;
                bestValue = parseInt(val);
            }
        }
        return bestValue;
    };

    // находим карточки с кворками
    [...document.querySelectorAll('.table-manage-kworks tr.manage-kworks__row div[data-kwork-id]')].forEach((row) => {
        const id = row.getAttribute('data-kwork-id');
        if (var_stat[id] === undefined) {
            var_stat[id] = {};
        }
        // находим строчки со статистикой
        [...row.querySelectorAll('.manage-kworks-item__inner .manage-kworks-item__metrics-item')].forEach((row_metric, key_metric) => {
            if (var_stat[id][key_metric] === undefined) {
                var_stat[id][key_metric] = {};
            }
            const currentValue = parseInt(row_metric.childNodes[2].innerText);
            if (!isNaN(currentValue)) {
                const todayStr = now.toISOString().slice(0, 10);
                if (var_stat[id][key_metric][currentValue] === undefined) {
                    var_stat[id][key_metric][currentValue] = todayStr;
                }
                const val7 = getValueNDaysAgo(var_stat[id][key_metric], 7);
                const val30 = getValueNDaysAgo(var_stat[id][key_metric], 30);

                let statBox = document.createElement('span');
                statBox.innerHTML = `<span style="color: #2ecc71;">+${val7}</span> | 
                                     <span style="color: #3498db;">+${val30}</span>`;
                row_metric.append(statBox);
            }
        });
    });
    localStorage.setItem(var_stat_name, JSON.stringify(var_stat));
})();
