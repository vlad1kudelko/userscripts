// ==UserScript==
// @name         Links getter
// @version      2025-06-03
// @description  Links getter
// @author       vlad1kudelko
// @match        *://*/*
// @grant        none
// ==/UserScript==

(() => {
    'use strict';
    let clear_urls = new Set();
    //---------------------------------------------------------------
    const var_selector = localStorage.getItem('linksgetter__var_selector') || '';
    const var_field    = localStorage.getItem('linksgetter__var_field') || 'href';
    let div = document.createElement('div');
    div.innerHTML = `
        <style>
            .linksgetter {
                position: fixed;
                right: 0;
                bottom: 0;
                z-index: 999998;
                color: gray;
                font-family: monospace;
                display: grid;
                row-gap: 10px;
                padding: 20px;
                min-width: 300px;
                max-width: 800px;
                border-top-left-radius: 10px;
                background-color: #222;
                border-top: 1px solid gray;
                border-left: 1px solid gray;
            }

            .linksgetter_hide {
                height: 0;
                padding: 0;
                border: none;
            }
            .linksgetter__toggle {
                position: absolute;
                right: calc(20px + 50px + 20px);
                bottom: 100%;
                padding: 10px;
                border-top-left-radius: 10px;
                border-top-right-radius: 10px;
                background-color: #222;
                border: 1px solid gray;
                border-bottom: none;
                cursor: pointer;
            }
            .linksgetter__inp {
                padding: 10px;
                background-color: black;
                outline: none;
                border: none;
                color: gray;
            }
            .linksgetter__group {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            .linksgetter__btn {
                padding: 10px;
                text-align: center;
                background-color: black;
                cursor: pointer;
            }
        </style>
        <div class="linksgetter linksgetter_hide">
            <div class="linksgetter__toggle">Links</div>

            <div>Selector</div>
            <div class="linksgetter__inp linksgetter__inp_selector" contenteditable="plaintext-only">${var_selector}</div>

            <div>Field</div>
            <div class="linksgetter__inp linksgetter__inp_field" contenteditable="plaintext-only">${var_field}</div>

            <div>Результат</div>
            <div class="linksgetter__inp linksgetter__result"></div>

            <div>Run</div>
            <div class="linksgetter__group">
                <div class="linksgetter__btn linksgetter__btn_copy">Copy</div>
                <div class="linksgetter__btn linksgetter__btn_clear">Clear</div>
            </div>
        </div>
    `;
    // --- linksgetter__toggle ---
    div.querySelector('.linksgetter__toggle').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        document.querySelector('.linksgetter').classList.toggle('linksgetter_hide');
    });
    // --- linksgetter__inp ---
    div.querySelector('.linksgetter__inp_selector').addEventListener('input', (event) => { localStorage.setItem('linksgetter__var_selector', event.target.innerHTML); });
    div.querySelector('.linksgetter__inp_field')   .addEventListener('input', (event) => { localStorage.setItem('linksgetter__var_field',    event.target.innerHTML); });
    // --- linksgetter__btn ---
    div.querySelector('.linksgetter__btn_copy').addEventListener('click', async (event) => {
        let ret = [];
        let urls = [...clear_urls];
        for (let url of urls) {
            ret.push(url);
        }
        await navigator.clipboard.writeText(ret.join('\n'));
    });
    div.querySelector('.linksgetter__btn_clear').addEventListener('click', async (event) => {
        clear_urls = new Set();
    });
    document.body.append(div);
    //---------------------------------------------------------------
    setInterval(() => {
        try {
            const var_selector = document.querySelector('.linksgetter__inp_selector').textContent;
            const var_field    = document.querySelector('.linksgetter__inp_field').textContent;
            let links = document.querySelectorAll(var_selector);
            for (let link of links) {
                clear_urls.add(link[var_field]);
            }
            document.querySelector('.linksgetter__result').innerHTML = 'Всего: ' + [...clear_urls].length;
        } catch (e) {
            document.querySelector('.linksgetter__result').innerHTML = 'Error';
        }
    }, 500);
    //---------------------------------------------------------------
})();
