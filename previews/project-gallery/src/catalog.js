import { motionProjects } from './projects-motion.js';
import { aiProjects } from './projects-ai.js';

export const projects = [
  {
    id:'taozhiyy', title:'桃之夭夭', author:'taozhiyy', category:'个人网站',
    summary:'以影像片段串联博客、相册、碎语与建站记录，收纳日常和不断生长的个人项目。',
    cover:'/covers/taozhiyy.webp', url:'https://taozhiyy.top/',
    source:'https://github.com/bistutzyy/taozhiyy', docs:'https://github.com/bistutzyy/taozhiyy',
    license:'本站原创内容；复用前分别核对源仓库及图片、音乐等素材的授权，不因公开访问而自动获得转载或商用许可。',
    licenseUrl:'https://github.com/bistutzyy/taozhiyy', reviewedAt:'2026-10-28',
    tags:['React','个人网站','四季','相册','时间轴'],
    demo:{kind:'external',url:'https://taozhiyy.top/',label:'访问本站',note:'已上线的真实站点；此预览不会修改线上页面或数据。'},
    sections:[
      ['关于这个项目','桃之夭夭是这个项目馆所在的小站。首页用影像片段串联不同入口，四季主题分布在关于我、浮光集、哔哩和友链页面。'],
      ['从主页开始','先浏览首页片段，进入博客或建站纪事；导航中的浮光集可以继续查看相册与碎语。当前项目馆仍为独立本地预览。'],
      ['浏览与互动','相册封面进入对应照片集合，创造纪事提供时间轴与文章索引。留言与评论的开放情况以各页面当前状态为准。'],
      ['预期效果','外部入口打开站点本身，动态封面、季节背景和内容均来自真实页面；封面截图只保留采集时的画面。'],
      ['源码与复用','通过下方来源链接查看源仓库。计划复用时先阅读项目说明与部署约束，另外确认第三方素材许可；不要复制生产配置或密钥。'],
    ],
  },
  ...motionProjects,
  ...aiProjects,
].map(project => ({...project,preview:project.cover.replace('/covers/','/thumbs/')}));

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
