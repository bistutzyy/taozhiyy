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
  'site-growth-16-lottery-wallpaper-source': {
    category: 'engineering', title: ['抽奖机抽不出图的那一天', 'The day the lottery lost its pictures'],
    tags: ['Lottery', 'API', 'Diagnosis'],
    note: ['接口一直是 200，池子里也一直有记录，但每条都是死链——图源域名已经指向别人的服务器。换成 Lolicon 直连，并让失效图源自动下线。', 'The API returned 200 and the pool kept returning rows, but every row was a dead link: the image domain now pointed at someone else. Switched to Lolicon and let retired sources remove themselves.'],
  },
  'site-growth-15-time-archive': {
    category: 'design', title: ['目录不是故事的讲法', 'A table of contents is not a story'],
    tags: ['Archive', 'Motion', 'Typography'],
    note: ['记录页从一列文章卡片，变成一条会跟着滚动延伸的时间轴。分类、搜索、阅读索引和可放大的页面留影一起进来，终于能看出时间在往前走。', 'The log page turns from a list of cards into a timeline that extends as you scroll, with filters, search, a reading index, and zoomable page snapshots.'],
  },
  'site-growth-14-four-seasons-theme': {
    category: 'design', title: ['四个页面，四种天气', 'Four pages, four kinds of weather'],
    tags: ['Seasons', 'Sakura', 'Ocean', 'Snow'],
    note: ['关于我、浮光集、哔哩哔哩、友链各自有了春樱、夏海、秋叶、冬雪。装饰只留在背景和页头，内容卡片保持原来的样子。', 'About, Glimmer, Bilibili, and Friends take on spring sakura, summer ocean, autumn leaves, and winter snow. Decoration stays in the background and headers.'],
  },
  'site-growth-13-glimmer-gallery-moments': {
    category: 'design', title: ['两个入口，合成一个', 'Two entrances into one'],
    tags: ['Glimmer', 'Albums', 'Moments'],
    note: ['相册集和碎语原本各占一个导航位置，内容都不多。合并成浮光集之后，上半是拍立得相册墙，下半是贴纸碎语，导航反而清爽了。', 'Albums and Moments each held a nav slot with little content. Merged into Glimmer: a polaroid wall above, sticky-note moments below, and a cleaner navigation.'],
  },
  'site-growth-12-friend-comments-waterfall': {
    category: 'design', title: ['评论区的形态，是被使用推着改的', 'A comment board shaped by use'],
    tags: ['Comments', 'Masonry', 'Avatars'],
    note: ['从单列到瀑布流走了五轮，最后停在每列两条、颜色交错。头像防盗链和统一占位这两件小事，比布局更影响观感。', 'Five rounds from a single column to masonry, settling on two seeded cards per column with alternating colors. Avatar hotlinking and placeholders mattered more than layout.'],
  },
  'site-growth-11-guestbook-script-attack': {
    category: 'engineering', title: ['先关掉入口，再慢慢看清楚', 'Close the door, then look closely'],
    tags: ['Security', 'XSS', 'Guestbook'],
    note: ['首页留言收到一批脚本化提交。处理顺序是先在后端停掉写入，再确认有没有真的落库，最后回到渲染方式本身。', 'A burst of scripted submissions hit the guestbook. The order: stop writes in the backend, then establish what actually landed, then revisit the render path itself.'],
  },
  'site-growth-10-pull-deploy-and-friend-pr': {
    category: 'engineering', title: ['把发布交还给服务器', 'Handing deployment back to the server'],
    tags: ['Deploy', 'Pull', 'Secrets'],
    note: ['发布链路从“GitHub 连进服务器”改成“服务器自己来取”。分支保护一开，站长后台发布友链也顺势改成自动开 PR。', 'Deployment flipped from GitHub pushing into the server to the server pulling. With branch protection on, friend-link publishing now opens a pull request instead.'],
  },
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
