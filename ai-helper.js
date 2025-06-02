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
                column-gap: 10px;
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
            <div class="inp" contenteditable="true"></div>

            <div>{Data}</div>
            <div class="inp" contenteditable="true"></div>

            <div>Ответ</div>
            <div class="inp result" contenteditable="true"></div>

            <div>Run</div>
            <div class="btns_group">
                <div class="btn btn_gen">Gen</div>
                <div class="btn btn_copy">Copy</div>
                <div class="btn btn_balance">Balance</div>
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
        // TODO
    });
    document.body.append(div);
    //---------------------------------------------------------------
})();
