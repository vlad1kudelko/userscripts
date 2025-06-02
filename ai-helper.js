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
            .ai_helper .toggle_btn {
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
            <div class="toggle_btn">AI</div>

            <div>Prompt</div>
            <div class="inp" contenteditable="true"></div>

            <div>{Data}</div>
            <div class="inp" contenteditable="true"></div>

            <div>Ответ</div>
            <div class="inp" contenteditable="true"></div>

            <div>Run</div>
            <div class="btns_group">
                <div class="btn btn_gen">Gen</div>
                <div class="btn btn_copy">Copy</div>
                <div class="btn btn_balance">Balance</div>
            </div>

            <div class="balance">Баланс: <span>X</span></div>
        </div>
    `;
    div.querySelector('.ai_helper .toggle_btn').addEventListener('click', async (event) => {
        if (event.target !== event.currentTarget) { return; }
        document.querySelector('.ai_helper').classList.toggle('hide');
    });
    // div.querySelector('.my_btn_1').addEventListener('click', async () => {
        // let ret = [];
        // let urls = [...clear_urls];
        // for (let url of urls) {
            // if (url.includes(document.location.href)) {
                // ret.push(url);
            // }
        // }
        // await navigator.clipboard.writeText(ret.join('\n'));
        // let old_html = document.querySelector('.my_msg').innerHTML;
        // if (old_html.length > 0) { old_html += '<br>'; }
        // old_html += (new Date()).toISOString() + '  ' + ret.length + ' URL copy';
        // document.querySelector('.my_msg').innerHTML = old_html;
    // });
    // div.querySelector('.my_btn_2').addEventListener('click', async () => {
        // let ret = [
            // document.querySelector('strong[title=Following]').innerHTML,
            // document.querySelector('strong[title=Followers]').innerHTML,
            // document.querySelector('strong[title=Likes]').innerHTML,
        // ].join(' / ');

        // await navigator.clipboard.writeText(ret);
        // let old_html = document.querySelector('.my_msg').innerHTML;
        // if (old_html.length > 0) { old_html += '<br>'; }
        // old_html += (new Date()).toISOString() + '  stat copy';
        // document.querySelector('.my_msg').innerHTML = old_html;
    // });
    document.body.append(div);
    //---------------------------------------------------------------
    // setInterval(() => {
        // let links = document.querySelectorAll('a');
        // for (let link of links) {
            // if (link.href.match(/https:\/\/www.tiktok.com\/.+\/video\/\d+$/)) {
                // clear_urls.add(link.href);
            // }
        // }
        // let arr_stat = [...document.querySelectorAll('.video-count')].map(a => parseInt(a.innerText));
        // let str_stat = `
            // <tr>
                // <td></td>
                // <td>videos</td>
                // <td>views</td>
            // </tr>`;
        // str_stat += '<tr><td>avg views</td><td>'+arr_stat.slice(0, 50).length+'</td><td>'+Math.floor(arr_stat.slice(0, 50).reduce((a,b)=>a+b,0)/arr_stat.slice(0, 50).length)+'</td></tr>';
        // str_stat += '<tr><td>avg views</td><td>'+arr_stat.slice(0,100).length+'</td><td>'+Math.floor(arr_stat.slice(0,100).reduce((a,b)=>a+b,0)/arr_stat.slice(0,100).length)+'</td></tr>';
        // str_stat += '<tr><td>avg views</td><td>'+arr_stat.slice(0,150).length+'</td><td>'+Math.floor(arr_stat.slice(0,150).reduce((a,b)=>a+b,0)/arr_stat.slice(0,150).length)+'</td></tr>';
        // str_stat += '<tr><td>avg views</td><td>'+arr_stat.slice(0,200).length+'</td><td>'+Math.floor(arr_stat.slice(0,200).reduce((a,b)=>a+b,0)/arr_stat.slice(0,200).length)+'</td></tr>';
        // str_stat += '<tr><td>avg max  </td><td>'+arr_stat             .length+'</td><td>'+Math.floor(arr_stat             .reduce((a,b)=>a+b,0)/arr_stat             .length)+'</td></tr>';
        // document.querySelector('.my_stat table').innerHTML = str_stat;
    // }, 500);
    //---------------------------------------------------------------
})();
