'use strict';
const categories = [
  {id:'all', name:'全部资源', icon:'✳'},
  {id:'Dataset', name:'Dataset', icon:'▦'},
  {id:'Model', name:'Model', icon:'◈'},
  {id:'GPU', name:'GPU', icon:'▥'},
  {id:'CPU', name:'CPU', icon:'◇'},
  {id:'Website', name:'Website', icon:'◎'},
  {id:'URL', name:'URL', icon:'↗'},
  {id:'Article', name:'文章笔记', icon:'≡'}
];
const kindNames = {all:'全部类型',text:'文本',image:'图像',video:'视频',audio:'音频',multi:'多模态',tool:'工具',ad:'平台',log:'文章'};
const engines = {
  google:'https://www.google.com/search?q=',
  baidu:'https://www.baidu.com/s?wd=',
  github:'https://github.com/search?q=',
  huggingface:'https://huggingface.co/models?search=',
  youtube:'https://www.youtube.com/results?search_query=',
  bilibili:'https://search.bilibili.com/all?keyword=',
  yandex:'https://yandex.com/images/search?text=',
  douyin:'https://www.douyin.com/search/'
};
const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const state = {
  category:params.get('category') || 'all',
  query:params.get('q') || params.get('s') || '',
  kind:params.get('kind') || 'all',
  alphabetical:params.get('sort') === 'name',
  limit:24, entries:[], filtered:[]
};
if (!categories.some(c => c.id === state.category)) state.category = 'all';
if (!kindNames[state.kind]) state.kind = 'all';
const special = {
  Dataset:new Set(['魔搭数据集','Kaggle','银河系全景图']),
  Model:new Set(['Leaderboard','GPT-Image 2','Claude','Gemini','Replicate','fal.ai','Z-Image-Turbo','FireRed-Image-Edit','FLUX.2-klein-9B','Qwen-Image-Edit','bonsai-image-webgpu','VoxCPM2','SoulX-Singer','IndexTTS-2','VibeVoice','Whisper','LTX-2.3','Wan2.2','LLM 本地测试']),
  GPU:new Set(['GPU Test','Cloud Studio','Colab']),
  URL:new Set(['Ping','IP-Addrs','Internet Speed Test','BBN Speed Test','Wormhole','船舶定位','航班定位','AI-信息'])
};
function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, location.href);
    return ['https:','http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function normalize(item, index, isArticle = false) {
  const url = safeUrl(item.url || item.links?.http || item.links?.hf || item.links?.hfCn);
  if (!url) return null;
  const category = isArticle ? 'Article' : item.category || Object.keys(special).find(key => special[key].has(item.title)) || 'Website';
  const links = {};
  for (const [key, value] of Object.entries(item.links || {})) {
    if (['hf','hfCn','http'].includes(key) && safeUrl(value)) links[key] = safeUrl(value);
  }
  return {
    ...item, index, category, url, links, isArticle,
    title:String(item.title || item.name || '未命名资源'),
    desc:String(item.desc || ''), content:String(item.content || ''),
    featured:!!(item.featured || item.isTop), kind:isArticle?'log':item.cat || '',
    desktop:!!(item.hideOnMobile || item.links?.hideOnMobile)
  };
}
function uniqueEntries(items) {
  const entries = new Map();
  for (const item of items.filter(Boolean)) {
    const key = item.url;
    if (entries.has(key)) {
      const existing = entries.get(key);
      existing.links = {...existing.links, ...item.links};
      existing.featured ||= item.featured;
      existing.kind ||= item.kind;
    } else entries.set(key,item);
  }
  return [...entries.values()];
}
function node(tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== undefined) el.textContent = value;
  return el;
}
function link(label, url, className) {
  const a = node('a',className,label);
  a.href = url;
  if (new URL(url).origin !== location.origin) { a.target='_blank'; a.rel='noopener noreferrer'; }
  return a;
}
function syncUrl() {
  const p = new URLSearchParams();
  if (state.category !== 'all') p.set('category',state.category);
  if (state.query.trim()) p.set('q',state.query.trim());
  if (state.kind !== 'all') p.set('kind',state.kind);
  if (state.alphabetical) p.set('sort','name');
  history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+location.hash);
}
function renderNav() {
  const nav = $('#category-nav'); nav.replaceChildren();
  categories.forEach(cat => {
    const button = node('button','category-button'+(state.category===cat.id?' active':''));
    button.type='button'; button.dataset.category=cat.id;
    button.setAttribute('aria-pressed',String(state.category===cat.id));
    const count = state.entries.filter(e=>cat.id==='all'?!e.isArticle:e.category===cat.id).length;
    button.append(node('span','category-icon',cat.icon),node('span','',cat.name),node('span','category-count',String(count).padStart(2,'0')));
    button.addEventListener('click',()=>{
      state.category=cat.id; state.kind='all'; state.limit=24;
      $('#kind-filter').value='all'; render();
      const selected = nav.querySelector('[aria-pressed="true"]');
      selected?.scrollIntoView({block:'nearest',inline:'nearest'});
    }); nav.append(button);
  });
}
function makeCard(item) {
  const card = node('article','card'+(item.isArticle?' article-card':''));
  const top = node('div','card-top');
  top.append(node('span','card-symbol',categories.find(c=>c.id===item.category)?.icon || '↗'));
  if (item.featured) top.append(node('span','card-badge','精选'));
  else if (item.desktop) top.append(node('span','card-badge','建议电脑使用'));
  const heading=node('h3'); heading.append(link(item.title,item.url,'card-primary'));
  const meta=node('div','card-meta');
  meta.append(node('span','card-kind',item.category.toUpperCase()),node('span','separator','/'),node('span','domain',item.isArticle?item.date || '笔记':new URL(item.url).hostname.replace(/^www\./,'')));
  card.append(top,heading,node('p','card-description',item.desc || '访问资源网站'),meta);
  if (Object.keys(item.links).length) {
    const actions=node('div','card-actions');
    for (const [key,label] of [['hf','Hugging Face'],['hfCn','国内镜像'],['http','官网 ↗']]) {
      if (item.links[key]) actions.append(link(label,item.links[key],'resource-link'));
    }
    card.append(actions);
  }
  return card;
}
function renderCards() {
  $('#cards').replaceChildren(...state.filtered.slice(0,state.limit).map(makeCard));
  const remaining=state.filtered.length-state.limit;
  $('#load-more').hidden=remaining<=0;
  $('#load-more').textContent=`加载更多 · 还有 ${Math.max(0,remaining)} 条 ↓`;
  $('#empty').hidden=state.filtered.length>0;
  $('#result-count').textContent=`${state.filtered.length} 条结果`;
}
function render() {
  renderNav(); syncUrl();
  const cat=categories.find(c=>c.id===state.category);
  const query=state.query.trim().toLocaleLowerCase();
  state.filtered=state.entries.filter(item=>{
    if (state.category!=='all' && item.category!==state.category) return false;
    if (state.kind!=='all' && item.kind!==state.kind) return false;
    if (item.isArticle && state.category==='all' && !query) return false;
    return !query || [item.title,item.desc,item.content,item.category,item.url,item.date,...(item.tag || [])].filter(Boolean).join(' ').toLocaleLowerCase().includes(query);
  });
  state.filtered.sort((a,b)=>state.alphabetical?a.title.localeCompare(b.title,'zh-CN'):(Number(b.featured)-Number(a.featured)||a.index-b.index));
  $('#current-index').textContent=String(categories.indexOf(cat)).padStart(2,'0');
  $('#current-category').textContent=cat.name;
  $('#sort-button').textContent=state.alphabetical?'名称排序 ↑':'精选优先 ↓';
  $('#clear-search').hidden=!state.query;
  $('#article-hint').hidden=state.category!=='all' || !!query;
  renderCards();
}
async function fetchList(path) {
  const response=await fetch(path);
  if (!response.ok) throw new Error(path+' 加载失败');
  const data=await response.json();
  if (!Array.isArray(data)) throw new Error(path+' 格式错误');
  return data;
}
async function init() {
  const result=await Promise.allSettled(['curated.json','list.json','data/posts.json'].map(fetchList));
  const groups=result.map(r=>r.status==='fulfilled'?r.value:[]);
  state.entries=uniqueEntries([
    ...groups[0].map((v,i)=>normalize(v,i)),
    ...groups[1].map((v,i)=>normalize(v,i+100)),
    ...groups[2].map((v,i)=>normalize(v,i+1000,true))
  ]);
  const failures=result.filter(r=>r.status==='rejected');
  if (failures.length) {
    $('#load-status').hidden=false;
    $('#load-status').textContent='部分内容未能加载，请刷新重试。已加载的资源仍可使用。';
  }
  $('#resource-total').textContent=state.entries.filter(e=>!e.isArticle).length;
  $('#article-total').textContent=state.entries.filter(e=>e.isArticle).length;
  render();
}
function clearSearch() {
  state.query=''; state.limit=24; $('#search').value=''; render(); $('#search').focus();
}
$('#search').value=state.query;
$('#kind-filter').value=state.kind;
$('#search').addEventListener('input',event=>{state.query=event.target.value;state.limit=24;render()});
$('#sort-button').addEventListener('click',()=>{state.alphabetical=!state.alphabetical;render()});
$('#kind-filter').addEventListener('change',event=>{state.kind=event.target.value;state.limit=24;render()});
$('#clear-search').addEventListener('click',clearSearch);
$('#reset-button').addEventListener('click',()=>{state.category='all';state.kind='all';$('#kind-filter').value='all';clearSearch()});
$('#load-more').addEventListener('click',()=>{const old=state.limit;state.limit+=24;renderCards();$('#cards').children[old]?.querySelector('a')?.focus()});
$('#search-form').addEventListener('submit',event=>{
  event.preventDefault();
  const query=state.query.trim();
  if (!query) {$('#search').focus();return;}
  const engine=$('#search-engine').value;
  if (engine==='local') { render(); $('#cards a')?.focus(); }
  else window.open(engines[engine]+encodeURIComponent(query),'_blank','noopener,noreferrer');
});
try {const saved=localStorage.getItem('datxy-search-engine');if(saved==='local'||engines[saved])$('#search-engine').value=saved;} catch {}
$('#search-engine').addEventListener('change',()=>{try {localStorage.setItem('datxy-search-engine',$('#search-engine').value)}catch{}});
document.addEventListener('keydown',event=>{
  const tag=document.activeElement.tagName;
  if (event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(tag)) {event.preventDefault();$('#search').focus();return;}
  if (event.key==='Escape'&&document.activeElement===$('#search')) $('#search').blur();
  if (event.key==='ArrowDown'&&document.activeElement===$('#search')) {event.preventDefault();$('#cards a')?.focus();return;}
  if (!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(event.key)) return;
  const card=document.activeElement.closest('.card');
  if (!card) return;
  const cards=[...$('#cards').children];
  const columns=getComputedStyle($('#cards')).gridTemplateColumns.split(' ').length;
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowDown:columns,ArrowUp:-columns}[event.key];
  const target=cards[cards.indexOf(card)+offset];
  if (target) {event.preventDefault();target.querySelector('a').focus();}
});
$('#year').textContent=new Date().getFullYear();
init();
