import { motionProjects } from './projects-motion.js';
import { aiProjects } from './projects-ai.js';

const publicBase = import.meta.env?.BASE_URL || '/';
const publicAsset = path => publicBase + path.replace(/^\//, '');

export const projects = [
  {
    id:'project-guide', isGuide:true, title:'项目星空 · 板块介绍', author:'taozhiyo', category:'板块介绍',
    summary:'认识奇想馆的项目分享空间，了解这里收录什么、每个项目有哪些资料，以及教程、试用和作者来源的区别。',
    cover:'/covers/project-guide.webp', reviewedAt:'2026-10-31',
    tags:['项目星空','板块介绍','开源项目','实用工具'],
    sections:[
      ['这里是做什么的','项目星空是奇想馆的项目分享空间。这里把个人创作、值得研究的开源项目和实用工具收在一起，重点是项目本身能做什么、适合谁，以及有哪些值得继续探索的地方。'],
      ['这里会收录什么','内容包括网站与创作工具、交互与动效、AI 与图像应用等。它是一份持续整理的项目清单，不是排名，也不代表所有收录项目都由本站开发。'],
      ['每个项目有哪些资料','图文简介先说明用途和适用场景，详细介绍再整理准备条件、使用教程、实践记录与参考资料。内容的完整程度以各项目的实际整理情况为准，不把文档介绍当成已经完成的实测。'],
      ['教程、试用与实践效果','部分项目提供作者演示、外部在线试用，或本站自己的实践效果；并不是每个项目都能直接在这里运行。需要本地环境、模型、账号、API 或硬件的内容，会结合项目资料说明，外部服务的费用与可用性以其当前规则为准。'],
      ['作者与来源','收录内容会标注原作者、项目仓库、官方文档及可核对的许可信息，方便找到原始资料。介绍与试用链接不代表本站运营相关服务，也不等同于完成了全部源码的安全审计；安装、复用或接入前仍应核对依赖、许可和服务条件。'],
      ['这份清单的初衷','把分散的作品、工具和想法放到同一个地方，让来访者更容易发现感兴趣的项目，了解背景，再决定要不要动手实践。希望这里不只是收藏链接，也能留下有出处、可继续研究的线索。'],
    ],
  },
  {
    id:'taozhiyy', title:'桃之夭夭', author:'taozhiyy', category:'个人网站',
    summary:'以影像片段串联博客、相册、碎语与建站记录，收纳日常和不断生长的个人项目。',
    cover:'/covers/taozhiyy.webp', url:'https://taozhiyy.top/',
    source:'https://github.com/bistutzyy/taozhiyy', docs:'https://github.com/bistutzyy/taozhiyy',
    license:'本站原创内容；复用前分别核对源仓库及图片、音乐等素材的授权，不因公开访问而自动获得转载或商用许可。',
    licenseUrl:'https://github.com/bistutzyy/taozhiyy', reviewedAt:'2026-10-28',
    tags:['React','个人网站','四季','相册','时间轴'],
    demo:{kind:'external',url:'https://taozhiyy.top/',label:'访问本站',note:'已上线的真实站点，可浏览首页影像、四季页面与建站记录。'},
    sections:[
      ['关于这个项目','桃之夭夭是这个项目馆所在的小站。首页用影像片段串联不同入口，四季主题分布在关于我、浮光集、哔哩和友链页面。'],
      ['从主页开始','先浏览首页片段，进入博客或建站纪事；导航中的浮光集可以继续查看相册与碎语。奇想馆展示项目介绍与原始来源。'],
      ['浏览与互动','相册封面进入对应照片集合，创造纪事提供时间轴与文章索引。留言与评论的开放情况以各页面当前状态为准。'],
      ['预期效果','外部入口打开站点本身，动态封面、季节背景和内容均来自真实页面；封面截图只保留采集时的画面。'],
      ['源码与复用','通过下方来源链接查看源仓库。计划复用时先阅读项目说明与部署约束，另外确认第三方素材许可；不要复制生产配置或密钥。'],
    ],
  },
  ...motionProjects,
  ...aiProjects,
].map(project => ({...project,cover:publicAsset(project.cover),preview:publicAsset(project.cover.replace('/covers/','/thumbs/'))}));

export function filterProjects(items, query = '') {
  const term = query.trim().toLocaleLowerCase();
  return items.filter(item => !term || [item.title, item.summary, item.author, item.category, ...item.tags].join(' ').toLocaleLowerCase().includes(term));
}
export function nextProject(items, id, direction) {
  if (!items.length) return null;
  const index = items.findIndex(item => item.id === id);
  return items[index < 0 ? 0 : (index + direction + items.length) % items.length];
}
export function projectPage(items, page = 0, size = 12) {
  const limit = Math.max(1, Math.floor(size) || 12);
  const pages = Math.ceil(items.length / limit);
  const current = Math.max(0, Math.min(Math.floor(page) || 0, Math.max(0, pages - 1)));
  return {items:items.slice(current * limit, (current + 1) * limit), page:current, pages, total:items.length};
}
