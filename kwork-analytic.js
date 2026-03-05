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
        const ret = Math.max(...arr_gt) - Math.max(...arr_lt);
        return ret > 0 ? ret : 0;
    };

    const getColor = (color, value) => {
        return value > 0 ? `<span style="font-weight: bold; color: ${color};">+${value}</span>` : '0';
    };

    const main = () => {
        const var_stat_name = 'kworkanalytic__var_stat';
        const globBox_name  = 'kworkanalytic__globBox';
        const var_stat = JSON.parse(localStorage.getItem(var_stat_name) || '{}');
        let glob_val1 = 0;
        let glob_val7 = 0;
        // находим карточки с кворками
        [...document.querySelectorAll('.table-manage-kworks .manage-kworks__row div[data-kwork-id]')].forEach((row) => {
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
                    const val1 = getValueNDaysAgo(var_stat[id][key_metric], 0);
                    const val7 = getValueNDaysAgo(var_stat[id][key_metric], 6);
                    glob_val1 += val1;
                    glob_val7 += val7;
                    let statBox = document.createElement('span');
                    statBox.style.cssText = `
                        display: inline-block;
                        width: 60px;
                        text-align: right;
                    `;
                    statBox.innerHTML =
                        getColor('#2ecc71', val1) + ' / ' +
                        getColor('#3498db', val7);
                    row_metric.childNodes[2].append(statBox);
                }
            });
        });
        localStorage.setItem(var_stat_name, JSON.stringify(var_stat));
        let globBox = document.createElement('div');
        globBox.id = globBox_name;
        globBox.style.cssText = `
            margin-bottom: 12px;
            display: grid;
            max-width: 200px;
            grid-template-columns: 1fr 1fr;
        `;
        globBox.innerHTML = `
            <div>За день</div>   <div>${getColor('#2ecc71', glob_val1)}</div>
            <div>За неделю</div> <div>${getColor('#3498db', glob_val7)}</div>
        `;
        document.querySelector('.manage-kworks__top-controls').before(globBox);
    };

    main();
})();
