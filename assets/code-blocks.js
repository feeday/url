/* Shared by published articles, Markdown previews and chat messages. */
window.DatxyCodeBlocks = {
  enhance(root) {
    root.querySelectorAll('pre').forEach((pre, index) => {
      if (pre.closest('.code-frame')) return;
      const code = pre.querySelector('code');
      const raw = code ? code.textContent : pre.textContent;
      const normalized = raw.replace(/\r\n?/g, '\n').replace(/\n$/, '');
      const count = normalized ? normalized.split('\n').length : 0;
      const classLanguage = (code?.className || pre.parentElement.className || '').match(/(?:language-|highlight-source-)([\w+-]+)/);
      const language = pre.getAttribute('lang') || code?.getAttribute('lang') || classLanguage?.[1] || '代码';
      const frame = document.createElement('div');
      frame.className = 'code-frame';
      const header = document.createElement(count > 10 ? 'summary' : 'div');
      header.className = 'code-header';
      const label = document.createElement('span');
      label.className = 'code-label';
      const detail = document.createElement('span');
      detail.className = 'code-count';
      label.textContent = language;
      detail.textContent = `${count} 行`;
      header.append(label, detail);
      const copy = document.createElement('button');
      copy.type = 'button'; copy.className = 'copy-code'; copy.textContent = '复制';
      copy.setAttribute('aria-label', `复制 ${language} 代码，${count} 行`);
      copy.setAttribute('aria-live', 'polite');
      pre.before(frame);
      let fold = null;
      if (count > 10) {
        fold = document.createElement('details');
        fold.className = 'code-fold';
        const action = document.createElement('span');
        action.className = 'code-toggle-label';
        const update = () => { action.textContent = fold.open ? '收起代码' : '展开代码'; };
        update(); fold.addEventListener('toggle', update);
        header.append(action); fold.append(header, pre); frame.append(fold, copy);
      } else frame.append(header, pre, copy);
      pre.tabIndex = 0;
      pre.setAttribute('aria-label', `${language} 代码，可横向滚动`);
      copy.addEventListener('click', async () => {
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(raw);
          copy.textContent = '已复制';
        } catch {
          if (fold) fold.open = true;
          const range = document.createRange();
          range.selectNodeContents(code || pre);
          const selection = window.getSelection();
          selection.removeAllRanges(); selection.addRange(range);
          copy.textContent = '已选中';
          copy.title = '请使用系统复制菜单或 Ctrl/Cmd+C';
        }
        setTimeout(() => { copy.textContent = '复制'; copy.removeAttribute('title'); }, 2200);
      });
    });
  }
};
