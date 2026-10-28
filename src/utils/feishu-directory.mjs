import domino from '@mixmark-io/domino';
/** Add search hooks to the editable Feishu list, without retaining a second copy of link data. */
export function enhanceLinkDirectory(html) {
  const doc=domino.createDocument('<body>'+html+'</body>');
  let section;
  for(const node of Array.from(doc.body.children)){
    if(node.tagName==='H2' || node.classList.contains('level-h2')){
      section=doc.createElement('section');section.setAttribute('data-link-section','');
      doc.body.insertBefore(section,node);section.appendChild(node);
    } else if(section)section.appendChild(node);
  }
  for(const list of Array.from(doc.querySelectorAll('section[data-link-section] > ul'))){
    list.classList.add('feishu-link-grid');
    for(const item of Array.from(list.children))if(item.querySelector('a'))item.setAttribute('data-link-card','');
  }
  return doc.body.innerHTML;
}

/** Homepage card content comes from ordinary paragraphs and a three-column Feishu table. */
export function enhanceHomeContent(html) {
  const doc=domino.createDocument('<body>'+html+'</body>');
  const ask=doc.querySelector('[data-feishu-component="AskBox"]');
  if(ask?.previousElementSibling?.tagName==='P'){
    const prompt=ask.previousElementSibling, wrap=doc.createElement('div');wrap.className='home-ask';prompt.className='home-ask__prompt';
    ask.parentNode.insertBefore(wrap,prompt);wrap.appendChild(prompt);wrap.appendChild(ask);
  }
  for(const table of Array.from(doc.querySelectorAll('table'))){
    const rows=Array.from(table.querySelectorAll('tr'));
    const labels=Array.from(rows[0]?.children||[]).map(n=>n.textContent.trim());
    if(labels.join('|')!=='栏目|入口|说明')continue;
    const grid=doc.createElement('div');grid.className='home-featured';
    for(const row of rows.slice(1)){
      const [kicker,title,description]=Array.from(row.children);const original=title?.querySelector('a');if(!original)continue;
      const card=doc.createElement('a');card.className='home-featured__card';card.href=original.getAttribute('href');
      for(const [tag,className,text] of [['span','home-featured__kicker',kicker.textContent],['strong','home-featured__title',title.textContent],['span','home-featured__desc',description.textContent]]){const n=doc.createElement(tag);n.className=className;n.textContent=text;card.appendChild(n);}
      grid.appendChild(card);
    }
    if(grid.children.length) table.parentNode.replaceChild(grid,table);
  }
  let grid;
  for(const node of Array.from(doc.body.children)){
    if(node.tagName==='H3'||node.classList.contains('level-h3')){grid=doc.createElement('div');grid.className='feishu-home-grid';node.parentNode.insertBefore(grid,node.nextSibling);}
    else if(node.tagName==='H2'||node.classList.contains('level-h2'))grid=undefined;
    else if(grid&&node.tagName==='P'&&node.firstElementChild?.tagName==='A'){
      node.classList.add('feishu-home-card');grid.appendChild(node);
    }
  }
  return doc.body.innerHTML;
}
