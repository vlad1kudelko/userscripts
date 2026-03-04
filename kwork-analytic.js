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

    const getValueNDaysAgo = (history, days) => {
        const targetStr = new Date(
            new Date().setDate(
                new Date().getDate() - days
            )
        ).toISOString().slice(0, 10);
        let arr_gt = [0];
        let arr_lt = [0];
        for (const [val, date] of Object.entries(history)) {
            if (date >= targetStr) { arr_gt.push(val); } else { arr_lt.push(val); }
        }
        return Math.max(...arr_gt) - Math.max(...arr_lt);
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
                const todayStr = (new Date()).toISOString().slice(0, 10);
                if (var_stat[id][key_metric][currentValue] === undefined) {
                    var_stat[id][key_metric][currentValue] = todayStr;
                }
                const val1 = getValueNDaysAgo(var_stat[id][key_metric], 1);
                const val7 = getValueNDaysAgo(var_stat[id][key_metric], 7);
                let statBox = document.createElement('span');
                statBox.style.cssText = `
                    display: inline-block;
                    width: 60px;
                    text-align: right;
                `;
                let ret_html = '';
                ret_html += (val1 > 0 ? `<span style="color: #2ecc71;">+${val1}</span>` : '0') + ' / ';
                ret_html += (val7 > 0 ? `<span style="color: #3498db;">+${val7}</span>` : '0');
                statBox.innerHTML = ret_html;
                row_metric.childNodes[2].append(statBox);
            }
        });
    });
    localStorage.setItem(var_stat_name, JSON.stringify(var_stat));
})();
