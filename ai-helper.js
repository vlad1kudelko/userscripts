// ==UserScript==
// @name         AI helper
// @version      2025-06-02
// @description  AI helper
// @author       vlad1kudelko
// @match        *://*/*
// @grant        none
// ==/UserScript==

(() => {
    'use strict';
    //---------------------------------------------------------------
    async function run_api(inp_url) {
        const token = localStorage.getItem('aihelper__var_token');
        const res = await fetch(inp_url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) { alert('Error: ' + res.status); return {}; }
        const res_json = await res.json();
        return res_json;
    }
    //---------------------------------------------------------------
    const var_system = localStorage.getItem('aihelper__var_system');
    const var_prompt = localStorage.getItem('aihelper__var_prompt');
    const var_data   = localStorage.getItem('aihelper__var_data');
    let div = document.createElement('div');
    div.innerHTML = `
        <style>
            .aihelper {
                position: fixed;
                right: 0;
                bottom: 0;
                z-index: 999999;
                color: gray;
                font-family: monospace;
                display: grid;
                row-gap: 10px;
                padding: 20px;
                min-width: 300px;
                border-top-left-radius: 10px;
                background-color: #222;
                border-top: 1px solid gray;
                border-left: 1px solid gray;
            }
            .aihelper_hide {
                height: 0;
                padding: 0;
                border: none;
            }
            .aihelper__toggle {
                position: absolute;
                right: 20px;
                bottom: 100%;
                padding: 10px;
                border-top-left-radius: 10px;
                border-top-right-radius: 10px;
                background-color: #222;
                border: 1px solid gray;
                border-bottom: none;
            }
            .aihelper__inp {
                padding: 10px;
                background-color: black;
                outline: none;
            }
            .aihelper__group {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            .aihelper__btn {
                padding: 10px;
                text-align: center;
                background-color: black;
                cursor: pointer;
            }
        </style>
        <div class="aihelper aihelper_hide">
            <div class="aihelper__toggle">AI</div>

            <div>System</div>
            <div class="aihelper__inp aihelper__inp_system" contenteditable="true">${var_system}</div>

            <div>Prompt</div>
            <div class="aihelper__inp aihelper__inp_prompt" contenteditable="true">${var_prompt}</div>

            <div>{Data}</div>
            <div class="aihelper__inp aihelper__inp_data" contenteditable="true">${var_data}</div>

            <div>Ответ</div>
            <div class="aihelper__inp aihelper__result" contenteditable="true"></div>

            <div>Run</div>
            <div class="aihelper__group">
                <div class="aihelper__btn aihelper__btn_gen">Gen</div>
                <div class="aihelper__btn aihelper__btn_copy">Copy</div>
                <div class="aihelper__btn aihelper__btn_balance">Balance</div>
                <div class="aihelper__btn aihelper__btn_load">Load</div>
            </div>

            <div class="aihelper__balance">Баланс: <span>X</span></div>
        </div>
    `;
    // --- aihelper__toggle ---
    div.querySelector('.aihelper__toggle').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        document.querySelector('.aihelper').classList.toggle('aihelper_hide');
    });
    // --- aihelper__inp ---
    div.querySelector('.aihelper__inp_system').addEventListener('input', (event) => { localStorage.setItem('aihelper__var_system', event.target.textContent); });
    div.querySelector('.aihelper__inp_prompt').addEventListener('input', (event) => { localStorage.setItem('aihelper__var_prompt', event.target.textContent); });
    div.querySelector('.aihelper__inp_data')  .addEventListener('input', (event) => { localStorage.setItem('aihelper__var_data',   event.target.textContent); });
    // --- aihelper__btn ---
    div.querySelector('.aihelper__btn_gen').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        // TODO
    });
    div.querySelector('.aihelper__btn_copy').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        await navigator.clipboard.writeText(document.querySelector('.aihelper__result').innerText);
    });
    div.querySelector('.aihelper__btn_balance').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        const balance_obj = await run_api('https://api.proxyapi.ru/proxyapi/balance');
        document.querySelector('.aihelper__balance span').innerText = balance_obj.balance;
    });
    div.querySelector('.aihelper__btn_load').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        const good_keys = [ 'aihelper__var_token', 'aihelper__var_prompt', 'aihelper__var_data' ];
        const old_json = JSON.stringify({
            'aihelper__var_token':  localStorage.getItem('aihelper__var_token'),
            'aihelper__var_prompt': localStorage.getItem('aihelper__var_prompt'),
            'aihelper__var_data':   localStorage.getItem('aihelper__var_data'),
        });
        const new_json = prompt('JSON', old_json);
        if (!new_json) { return; }
        if (new_json === old_json) { return; }
        const inp_obj = JSON.parse(new_json);
        for (let key in inp_obj) {
            if (!good_keys.includes(key)) { alert('Bad key: ' + key); return; }
            localStorage.setItem(key, inp_obj[key]);
        }
    });
    document.body.append(div);
    //---------------------------------------------------------------
})();
