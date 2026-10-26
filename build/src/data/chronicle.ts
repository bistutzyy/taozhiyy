import { siteContent } from './content';
import type { Article } from './types';

export type ArchiveCategory = 'design' | 'feature' | 'engineering';
type Copy = [string, string];
type EntryNotes = { category: ArchiveCategory; title: Copy; tags: string[]; note: Copy };

export const categories: { id: ArchiveCategory | 'all'; label: Copy }[] = [
  { id: 'all', label: ['全部记录', 'All records'] },
  { id: 'design', label: ['设计手记', 'Design'] },
  { id: 'feature', label: ['功能生长', 'Features'] },
  { id: 'engineering', label: ['幕后工程', 'Engineering'] },
];

const notes: Record<string, EntryNotes> = {
  'site-growth-09-about-quizcard-showcase': {
    category: 'feature', title: ['让作品，真正被看见', 'Giving the work a place to live'],
    tags: ['About', 'AI QuizCard', 'Showcase'],
    note: ['关于页成为正式入口，项目集终于能被真正打开。QuizCard 补上默认题组，第一次来的人也可以直接开始练习。', 'The About page becomes a real destination. QuizCard adds starter decks so a first-time visitor can begin practicing immediately.'],
  },
  'site-growth-08-mail-friends-ai-image': {
    category: 'feature', title: ['小站开始回应每一次到访', 'A small site that responds'],
    tags: ['Mail', 'Friends', 'AI Image'],
    note: ['留言通知、连续回复、服务器状态与 AI 生图串成了完整的体验。生成的图片存入 COS，让一次短暂的灵感有了稳定的地址。', 'Mail, threaded replies, server status, and image generation become a connected experience. Generated images are saved to COS.'],
  },
  'site-growth-07-moments-controller-scroll-release': {
    category: 'design', title: ['给零碎的念头，一个位置', 'A place for passing thoughts'],
    tags: ['Moments', 'Navigation', 'Scroll'],
    note: ['碎语走进主站导航，发布链路也接上了真实接口。双层滚动被整理掉，页面终于可以顺畅地往下读。', 'Moments joins the main navigation with a working publishing flow. Nested scrolling is removed for a more natural reading experience.'],
  },
  'site-growth-06-owner-console-backend-security': {
    category: 'engineering', title: ['在热闹背后，守好边界', 'Looking after what stays behind the scenes'],
    tags: ['Owner Console', 'Auth', 'Security'],
    note: ['收件箱、文章、友链、相册与图片上传接入站长接口。公开页面和私密配置之间，也有了更清晰的边界。', 'The owner console connects to publishing, uploads, albums, and the inbox. Public content and private configuration get clearer boundaries.'],
  },
  'site-growth-05-navigation-ai-gallery-source-lottery': {
    category: 'feature', title: ['把偶然，做成一次小惊喜', 'Making room for a little surprise'],
    tags: ['Gallery', 'Source Lottery', 'AI'],
    note: ['相册回到主站，导航重新梳理。参考来源卡片变成 Source Lottery，让一次点击多了一点偶然和趣味。', 'The gallery moves into the main site. Source Lottery turns a reference card into a playful chance encounter.'],
  },
  'site-growth-04-homepage-originalization': {
    category: 'design', title: ['从参考出发，长出自己的样子', 'Finding a voice of its own'],
    tags: ['Homepage', 'Typography', 'Motion'],
    note: ['保留学习时的好奇，再逐一改写文案、色调、字体和交互。首页从一份参考，慢慢变成自己的表达。', 'Copy, color, type, and interaction are reworked one by one, bringing a personal voice to the home page.'],
  },
  'site-growth-03-backend-services': {
    category: 'engineering', title: ['让页面背后，有真实的回应', 'Making the site come alive'],
    tags: ['Go', 'SQLite', 'API'],
    note: ['登录、留言、AI 助手和统计有了后端支撑。网站开始保存状态，也开始理解不同访问者的身份。', 'Authentication, messages, AI, and statistics gain a backend. The site can now hold state and distinguish visitor identities.'],
  },
  'site-growth-02-frontend-design': {
    category: 'design', title: ['搭起第一间，属于自己的小屋', 'The first room of a personal corner'],
    tags: ['React', 'Hexo', 'Vite'],
    note: ['主站、Hexo 博客与成长博客的分工逐渐清晰。这是最早一轮关于页面结构、视觉表达和内容归属的尝试。', 'The main site, Hexo blog, and growth journal find their roles in an early exploration of structure and visual identity.'],
  },
  'site-growth-01-infra-prep': {
    category: 'engineering', title: ['一切从一个地址开始', 'It begins with an address'],
    tags: ['Domain', 'DNS', 'UCloud'],
    note: ['在页面出现以前，先安顿域名、解析与服务器。一个想法，从此有了可以被访问的地方。', 'Before the first page, the domain, DNS, and server come together. An idea gets an address people can visit.'],
  },
};

export type ChronicleEntry = Article & EntryNotes & { number: string };
export const chronicleEntries: ChronicleEntry[] = [...siteContent.articles]
  .sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug))
  .map((article, index, entries) => ({
    ...article,
    ...(notes[article.slug] ?? {
      category: 'feature' as const,
      title: [article.title_zh, article.title_en] as Copy,
      tags: [],
      note: [article.excerpt_zh, article.excerpt_en] as Copy,
    }),
    number: String(entries.length - index).padStart(2, '0'),
  }));
