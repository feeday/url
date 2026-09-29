/* npm install --no-save playwright; npx playwright install chromium; node tests/browser.cjs */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const results = path.join(root, 'test-results');
fs.mkdirSync(results, {recursive:true});
const fixture = execFileSync('python3',['-c',`
import sys
sys.path.insert(0,'scripts')
from publish_issues import render
blocks=''.join('<h2>Code '+str(n)+'</h2><pre lang="python"><code>'+('print(1)\\n'*n)+'</code></pre>' for n in [1,10,11])
blocks+='<table><tr>'+('<th>Long column</th>'*12)+'</tr></table><pre>'+('x'*400)+'</pre>'
print(render({'title':'代码折叠与排版测试','html_url':'https://github.com/feeday/url/issues/1','number':1,'updated_at':'2026-09-29','body_html':blocks}))
`],{cwd:root,encoding:'utf8'});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name==='/__fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}
  let base=root;
  if(name.startsWith('/__fonts/')&&process.env.QA_FONT_DIR){base=process.env.QA_FONT_DIR;name=name.slice('/__fonts'.length);}
  if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(base,'.'+name);
  if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));}
  catch{res.writeHead(404).end('not found');}
});
async function noOverflow(page,label){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflows');}
async function screenshotFonts(page){
  if(!process.env.QA_FONT_DIR || new URL(page.url()).pathname === '/__fixture')return;
  await page.addStyleTag({url:'/__fonts/400.css'});
  await page.addStyleTag({content:"body{font-family:'Noto Sans SC',system-ui,sans-serif}"});
  await page.evaluate(()=>document.fonts.ready);
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
    await context.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith('about:')?route.continue():route.abort());
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const width of [320,390,768,1024,1440,1920]){
      await page.setViewportSize({width,height:900});
      await page.goto(origin+'/');await page.waitForSelector('.card');
      await noOverflow(page,'Home '+width);
      assert.equal(await page.locator('.card').count(),24);
      if([390,1440].includes(width)){
        await screenshotFonts(page);await page.screenshot({path:path.join(results,`home-${width}.png`)});
        await page.locator('#explore').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(results,`directory-${width}.png`)});
      }
      await page.goto(origin+'/__fixture');await page.waitForSelector('.code-frame');
      await noOverflow(page,'Article '+width);
      assert.equal(await page.locator('.code-fold').count(),1);
      assert.equal(await page.locator('.code-fold').evaluate(e=>e.open),false);
      assert.equal(await page.locator('.code-frame').nth(1).locator('pre').isVisible(),true);
      await page.locator('.code-fold summary').click();
      assert.equal(await page.locator('.code-fold').evaluate(e=>e.open),true);
      await noOverflow(page,'Expanded code '+width);
      if([390,1440].includes(width)){
        await screenshotFonts(page);await page.screenshot({path:path.join(results,`article-${width}.png`)});
      }
      console.log(`PASS ${width}px home, article, code boundary and horizontal overflow`);
    }
    await page.locator('.code-fold summary').click();
    await page.locator('.code-frame').nth(2).getByRole('button').click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'print(1)\n'.repeat(11));
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));
    await page.locator('.code-frame').nth(2).getByRole('button').click();
    assert.equal(await page.locator('.code-fold').evaluate(e=>e.open),true);
    assert.equal((await page.evaluate(()=>window.getSelection().toString())).trimEnd(),'print(1)\n'.repeat(11).trimEnd());
    await page.goto(origin+'/');await page.waitForSelector('.card');
    await page.locator('#load-more').click();assert.equal(await page.locator('.card').count(),48);
    await page.locator('#search').fill('VOLUME_MAK');
    assert.equal(await page.locator('.article-card').count(),1);
    assert.match(await page.locator('.article-card h3').innerText(),/win11-key/);
    await page.locator('#clear-search').click();assert.equal(await page.locator('.article-card').count(),0);
    await page.locator('[data-category="Article"]').click();assert.equal(await page.locator('.article-card').count(),2);
    await page.locator('[data-category="all"]').click();await page.locator('#search').fill('磁盘空间整理');
    assert.equal(await page.locator('.card-actions a').count(),3);
    await page.locator('#search').fill('x & 中文');await page.locator('#search-engine').selectOption('google');
    await page.evaluate(()=>{window.open=(url)=>{window.testOpened=url;};});
    await page.locator('.search-submit').click();
    assert.equal(await page.evaluate(()=>window.testOpened),'https://www.google.com/search?q='+encodeURIComponent('x & 中文'));
    await page.locator('#search').fill('zzzz_no_match');assert.equal(await page.locator('#empty').isVisible(),true);
    await page.locator('#reset-button').click();assert.equal(await page.locator('.card').count(),24);
    console.log('PASS search, article discovery, multi-link cards, pagination, engine encoding and empty state');
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:900});await page.goto(origin+'/aigx-x.html');
      await page.getByRole('tab',{name:'MD 编辑'}).click();
      const md=page.frameLocator('#mdFrame');await md.locator('#markdownInput').waitFor();
      const code=n=>'```python\n'+'print(1)\n'.repeat(n)+'```';
      await md.locator('#markdownInput').fill(code(10)+'\n\n'+code(11));
      assert.equal(await md.locator('.code-frame').count(),2);assert.equal(await md.locator('.code-fold').count(),1);
      assert.equal(await md.locator('.code-fold').evaluate(e=>e.open),false);
      await md.locator('.code-fold summary').click();assert.equal(await md.locator('.code-fold').evaluate(e=>e.open),true);
      assert.equal(await md.locator('body').evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(width===390)assert.equal(await md.locator('#sidePanel').isVisible(),false);
      await noOverflow(page,'Workbench '+width);
      for(const tool of ['gpu/','xlsx.html','dB.html']){
        await page.goto(origin+'/'+tool);await noOverflow(page,tool+' '+width);
      }
      console.log('PASS '+width+'px Markdown editor and migrated tool shells');
    }
    assert.deepEqual(errors,[],'Unexpected browser errors');
    console.log('ALL BROWSER CHECKS PASSED');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
