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
    async function run_api(inp_url, inp_data) {
        const token = localStorage.getItem('aihelper__var_token');
        let res;
        if (inp_data) {
            res = await fetch(inp_url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inp_data),
            });
        } else {
            res = await fetch(inp_url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        }
        if (!res.ok) { alert('Error: ' + res.status); return {}; }
        const res_json = await res.json();
        return res_json;
    }
    //---------------------------------------------------------------
    const var_version = localStorage.getItem('aihelper__var_version') || 'gpt-4.1-nano';
    const var_system  = localStorage.getItem('aihelper__var_system')  || '';
    const var_prompt  = localStorage.getItem('aihelper__var_prompt');
    const var_data    = localStorage.getItem('aihelper__var_data')    || '';
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
                min-width: 300px;
                max-width: 800px;
                border-top-left-radius: 10px;
                background-color: #222;
                border-top: 1px solid gray;
                border-left: 1px solid gray;
            }
            .aihelper_hide {
                height: 0;
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
                cursor: pointer;
            }
            .aihelper__scroll {
                max-height: 80vh;
                overflow-y: scroll;
                display: grid;
                row-gap: 10px;
                padding: 20px;
            }
            .aihelper__inp {
                padding: 10px;
                background-color: black;
                outline: none;
                border: none;
                color: gray;
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

            <div class="aihelper__scroll">
                <div>Version</div>
                <select class="aihelper__inp aihelper__inp_version">
                    <option value="gpt-4.1-nano" ${ var_version === 'gpt-4.1-nano' ? 'selected' : '' }> gpt-4.1-nano (28,80 ₽)  </option>
                    <option value="gpt-4o-mini"  ${ var_version === 'gpt-4o-mini'  ? 'selected' : '' }> gpt-4o-mini  (43,20 ₽)  </option>
                    <option value="gpt-4.1-mini" ${ var_version === 'gpt-4.1-mini' ? 'selected' : '' }> gpt-4.1-mini (115,20 ₽) </option>
                    <option value="gpt-4.1"      ${ var_version === 'gpt-4.1'      ? 'selected' : '' }> gpt-4.1      (576 ₽)    </option>
                    <option value="gpt-4o"       ${ var_version === 'gpt-4o'       ? 'selected' : '' }> gpt-4o       (720 ₽)    </option>
                </select>

                <div>System</div>
                <div class="aihelper__inp aihelper__inp_system" contenteditable="plaintext-only">${var_system}</div>

                <div>Prompt</div>
                <div class="aihelper__inp aihelper__inp_prompt" contenteditable="plaintext-only">${var_prompt}</div>

                <div>{Data}</div>
                <div class="aihelper__inp aihelper__inp_data" contenteditable="plaintext-only">${var_data}</div>

                <div>Результат</div>
                <div class="aihelper__inp aihelper__result" contenteditable="plaintext-only"></div>

                <div>Run</div>
                <div class="aihelper__group">
                    <div class="aihelper__btn aihelper__btn_gen">Gen</div>
                    <div class="aihelper__btn aihelper__btn_copy">Copy</div>
                    <div class="aihelper__btn aihelper__btn_balance">Balance</div>
                    <div class="aihelper__btn aihelper__btn_load">Load</div>
                </div>

                <div class="aihelper__balance">Баланс: <span>X</span></div>
            </div>
        </div>
    `;
    // --- aihelper__toggle ---
    div.querySelector('.aihelper__toggle').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        document.querySelector('.aihelper').classList.toggle('aihelper_hide');
    });
    // --- aihelper__inp ---
    div.querySelector('.aihelper__inp_version').addEventListener('input', (event) => { localStorage.setItem('aihelper__var_version', event.target.value);     });
    div.querySelector('.aihelper__inp_system') .addEventListener('input', (event) => { localStorage.setItem('aihelper__var_system',  event.target.innerHTML); });
    div.querySelector('.aihelper__inp_prompt') .addEventListener('input', (event) => { localStorage.setItem('aihelper__var_prompt',  event.target.innerHTML); });
    div.querySelector('.aihelper__inp_data')   .addEventListener('input', (event) => { localStorage.setItem('aihelper__var_data',    event.target.innerHTML); });
    // --- aihelper__btn ---
    div.querySelector('.aihelper__btn_gen').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        const var_version = document.querySelector('.aihelper__inp_version').value;
        const var_system  = document.querySelector('.aihelper__inp_system' ).textContent;
        const var_prompt  = document.querySelector('.aihelper__inp_prompt' ).textContent;
        const var_data    = document.querySelector('.aihelper__inp_data'   ).textContent;
        const prompt = var_prompt.replaceAll('{Data}', var_data);
        document.querySelector('.aihelper__result').innerText = 'Запрос отправлен, ожидайте...';
        const res = await run_api('https://api.proxyapi.ru/openai/v1/chat/completions', {
            model: var_version,
            messages: [
                { role: 'system', content: var_system },
                { role: 'user',   content: prompt     },
            ],
        });
        document.querySelector('.aihelper__result').innerText = res.choices[0].message.content;
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
        const good_keys = [
            'aihelper__var_token',
            'aihelper__var_version',
            'aihelper__var_system',
            'aihelper__var_prompt',
            'aihelper__var_data',
        ];
        const old_json = JSON.stringify({
            'aihelper__var_token':   localStorage.getItem('aihelper__var_token'),
            'aihelper__var_version': localStorage.getItem('aihelper__var_version'),
            'aihelper__var_system':  localStorage.getItem('aihelper__var_system'),
            'aihelper__var_prompt':  localStorage.getItem('aihelper__var_prompt'),
            'aihelper__var_data':    localStorage.getItem('aihelper__var_data'),
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
