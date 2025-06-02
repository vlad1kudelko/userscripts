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
        const token = localStorage.getItem('ai_helper__token');
        const res = await fetch(inp_url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) { alert('Error: ' + res.status); return {}; }
        const res_json = await res.json();
        return res_json;
    }
    //---------------------------------------------------------------
    let div = document.createElement('div');
    div.innerHTML = `
        <style>
            .ai_helper {
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
            .ai_helper.hide {
                height: 0;
                padding: 0;
                border: none;
            }
            .ai_helper .btn_toggle {
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
            .ai_helper .inp {
                padding: 10px;
                background-color: black;
                outline: none;
            }
            .ai_helper .btns_group {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            .ai_helper .btn {
                padding: 10px;
                text-align: center;
                background-color: black;
                cursor: pointer;
            }
        </style>
        <div class="ai_helper hide">
            <div class="btn_toggle">AI</div>

            <div>Prompt</div>
            <div class="inp inp_prompt" contenteditable="true"></div>

            <div>{Data}</div>
            <div class="inp inp_data" contenteditable="true"></div>

            <div>Ответ</div>
            <div class="inp result" contenteditable="true"></div>

            <div>Run</div>
            <div class="btns_group">
                <div class="btn btn_gen">Gen</div>
                <div class="btn btn_copy">Copy</div>
                <div class="btn btn_balance">Balance</div>
                <div class="btn btn_load">Load</div>
            </div>

            <div class="balance">Баланс: <span>X</span></div>
        </div>
    `;
    div.querySelector('.ai_helper .btn_toggle').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        document.querySelector('.ai_helper').classList.toggle('hide');
    });
    div.querySelector('.ai_helper .btn_gen').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        // TODO
    });
    div.querySelector('.ai_helper .btn_copy').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        await navigator.clipboard.writeText(document.querySelector('.ai_helper .result').innerText);
    });
    div.querySelector('.ai_helper .btn_balance').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        const balance_obj = await run_api('https://api.proxyapi.ru/proxyapi/balance');
        document.querySelector('.ai_helper .balance span').innerText = balance_obj.balance;
    });
    div.querySelector('.ai_helper .btn_load').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        const good_keys = [ 'ai_helper__token', 'ai_helper__prompt', 'ai_helper__data' ];
        const old_json = JSON.stringify({
            'ai_helper__token':  localStorage.getItem('ai_helper__token'),
            'ai_helper__prompt': localStorage.getItem('ai_helper__prompt'),
            'ai_helper__data':   localStorage.getItem('ai_helper__data'),
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
