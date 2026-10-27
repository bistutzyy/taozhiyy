export const projects = [
  {
    id: 'taozhiyy', title: '桃之夭夭', en: 'A personal corner of the internet',
    kind: 'mine', author: 'taozhiyy', category: '个人网站', accent: '#bf657d',
    summary: '把影像、日常与小小的创造，收进一座会生长的个人网站。',
    cover: '/covers/taozhiyy.webp', url: 'https://taozhiyy.top/',
    source: 'https://github.com/bistutzyy/taozhiyy', tags: ['React', '个人网站', '四季'],
    sections: [
      ['关于这个项目', '这是这个项目馆所在的小站。主页以影像片段串联内容，关于我、浮光集、哔哩和友链分别拥有自己的季节气息。'],
      ['从哪里开始', '打开主页，可以从片段入口进入博客、建站纪事，也可以从导航进入照片、碎语和友链。'],
      ['我的记录', '项目截图来自站点当前公开页面。具体实现和历次调整，收录在创造纪事中。'],
    ],
  },
  {
    id: 'chronicle', title: '创造纪事', en: 'A website, one little step at a time',
    kind: 'mine', author: 'taozhiyy', category: '交互档案', accent: '#558a80',
    summary: '一条可以翻阅的时间轴，留下建站、试错与每一次更新。',
    cover: '/covers/chronicle.webp', url: 'https://taozhiyy.top/build/',
    source: 'https://github.com/bistutzyy/taozhiyy/tree/master/build', tags: ['React', '时间轴', 'Motion'],
    sections: [
      ['关于这个项目', '把网站的成长文章组织成一条时间轴，保留分类、搜索和阅读索引，让更新不只是零散的提交记录。'],
      ['如何使用', '选择记录分类，或搜索一个关键词；点击时间轴上的标题就能打开完整文章。阅览索引可以直接定位到某一篇。'],
      ['体验入口', '下方入口打开已上线的创造纪事。本地项目馆只展示介绍，不会修改时间轴中的内容。'],
    ],
  },
  {
    id: 'glimmer', title: '浮光集', en: 'Photographs and little pieces of life',
    kind: 'mine', author: 'taozhiyy', category: '影像手札', accent: '#478da3',
    summary: '把相册和短句放在一起，让照片与日常心绪相互作伴。',
    cover: '/covers/glimmer.webp', url: 'https://taozhiyy.top/glimmer',
    source: 'https://github.com/bistutzyy/taozhiyy/tree/master/main', tags: ['相册', '碎语', '夏日'],
    sections: [
      ['关于这个项目', '相册集与碎语共用一个入口，保留照片陈列和便利贴的阅读感，以海浪作为夏季背景。'],
      ['如何浏览', '从相册封面进入对应照片集合，在同一页继续阅读碎语。图片和文字仍然是主要内容。'],
      ['画面记录', '这里使用公开页面截图作为封面，动态海浪和完整相册可以前往原页面查看。'],
    ],
  },
  {
    id: 'magic', title: 'Magic Portfolio', en: 'A thoughtful home for creative work',
    kind: 'shared', author: 'Once UI', category: '作品集模板', accent: '#8c78a9',
    summary: '从作品封面到完整案例，一套简洁的个人作品集展示方案。',
    cover: '/covers/magic.webp', url: 'https://magic-portfolio-demo.vercel.app/',
    source: 'https://github.com/once-ui-system/magic-portfolio', tags: ['Next.js', 'MDX', '作品集'],
    sections: [
      ['为什么收录', '它把项目列表、案例文章和个人介绍组织得很清楚，是这个项目馆保留的平面展示参考方案。'],
      ['开始使用', '从原仓库获取项目，按 README 安装依赖与启动；通过内容配置和项目 MDX 文件维护作品。具体命令以原仓库当前文档为准。'],
      ['使用前留意', '原仓库当前标注 CC BY-NC 4.0。复用代码和素材之前应核对署名与使用条件。本页仅作项目介绍，并非本站原创作品。'],
    ],
  },
  {
    id: 'fiber', title: '3D Image Gallery', en: 'Pictures, with a little more dimension',
    kind: 'shared', author: 'pmndrs', category: '3D 交互', accent: '#739369',
    summary: '在真实的三维空间里陈列图像，让观看变成一次轻巧的探索。',
    cover: '/covers/fiber.webp', url: 'https://pmndrs.github.io/examples/image-gallery/',
    source: 'https://github.com/pmndrs/examples', tags: ['Three.js', 'React Three Fiber', 'WebGL'],
    sections: [
      ['为什么收录', '这个开源示例展示了三维图像展览的思路，也是当前空间式项目陈列的交互参考之一。'],
      ['体验与源码', '打开原示例查看空间与镜头交互；源码位于 pmndrs 的 examples 仓库。它是演示案例，不是带后台的完整项目分享平台。'],
      ['设备与素材', 'WebGL 的表现取决于设备与浏览器。使用示例时还需要分别确认图片、模型等素材的授权。'],
    ],
  },
  {
    id: 'starlight', title: 'Starlight', en: 'Good ideas deserve good documentation',
    kind: 'shared', author: 'Astro', category: '文档工具', accent: '#b59355',
    summary: '让使用方法也有清晰的目录、搜索和舒服的阅读体验。',
    cover: '/covers/starlight.webp', url: 'https://starlight.astro.build/',
    source: 'https://github.com/withastro/starlight', tags: ['Astro', '文档', 'Markdown'],
    sections: [
      ['为什么收录', 'Starlight 提供面向文档的导航、搜索、代码展示和内容结构，可以作为项目使用手册的参考。'],
      ['开始使用', '访问官方文档的 Getting Started，从提供的模板建立文档站，再用 Markdown 或 MDX 编写内容。'],
      ['适合什么场景', '当一个项目拥有较多安装、配置和进阶章节时，独立的文档目录会比一篇很长的介绍更容易阅读。'],
    ],
  },
];

export function filterProjects(items, kind = 'all', query = '') {
  const term = query.trim().toLocaleLowerCase();
  return items.filter(item => (kind === 'all' || item.kind === kind)
    && (!term || [item.title, item.summary, item.author, ...item.tags].join(' ').toLocaleLowerCase().includes(term)));
}

export function nextProject(items, id, direction) {
  if (!items.length) return null;
  const index = items.findIndex(item => item.id === id);
  return items[index < 0 ? 0 : (index + direction + items.length) % items.length];
}
