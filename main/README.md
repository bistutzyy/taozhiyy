# 桃之夭夭 - Personal Frontend Website

> 🎨 Heavily customized personal homepage based on the open-source project by **Adrian Hajdin**.

## 🙏 Credits

This project is a fork of **[Adrian Hajdin's Award-Winning Website](https://github.com/adrianhajdin/award-winning-website)**. All original design and code credits go to Adrian Hajdin and the JavaScript Mastery team. The original project showcases beautiful modern web design with GSAP scroll animations, bento-grid layouts, and cinematic video storytelling — built step-by-step in their [YouTube tutorial](https://youtu.be/zA9r5zTllx4).

## ✨ Customization

This version has been extensively customized for personal use:

- **Hero Section**: All background videos replaced with anime-style content. Main video in 4K. "桃之夭夭 / WELCOME" branding.
- **About Section**: New illustrations. "FEEL FREE TO KEEP SCROLLING DOWN" message.
- **Story Section**: Anime scene background. "FOLLOW-UP PLAN" and "LOOK FORWARD TO IT TO THE FULLEST".
- **Features (Bento Grid)**: Three links — [My Blog](https://bistutzyy.github.io/), [Projects](https://tzyy11.vercel.app/), and [Reimu Blog](https://blog1-reimu.vercel.app/) — each with "Let's go!" buttons.
- **Moments Page**: `/moments` is now a first-class top-nav page named “碎语”, rendering short notes from `src/data/moments.js` with varied holographic card modules.
- **Friends Page**: Friend cards are maintained in `src/data/friendCards.js`; the `https://930309.xyz/` entry is `Leyili 花园` with icon `https://photo.930309.xyz/lcj.svg`.
- **Contact Section**: Credits to Adrian Hajdin with a link to the original repo.
- **Footer**: GitHub / Bilibili / Vercel / Email social icons with hover tooltips. "本站仅作学习使用，感谢开源" disclaimer.
- **Assets**: Circular avatar logo, anime illustrations, custom videos, and background music.
- **Layout Stability**: Homepage and shared site layout overflow handling has been tightened to avoid page-level double scrollbars.

## 🛠 Tech Stack

- React 18 + Vite
- Tailwind CSS
- GSAP (ScrollTrigger)
- React Icons

## 🧩 Current Site Modules

- `/projects/`: 奇想馆 project cosmos, linked from homepage fragment 01. Built separately and included in `main/dist/projects` by `npm run build`.
- `/moments`: 碎语 page, with postcard/ticket/watercolor/poem/journal/ribbon style modules.
- `/friends`: friend links and friend-page messages.
- `/gallery`: gallery albums and published image URLs.
- `/app`: owner console for drafts, article publishing, friend publishing, moment publishing, gallery publishing, and uploads through the backend owner APIs.
- `/ai-traffic`: data center page for AI traffic and live server status telemetry.

## 🗓 Follow-Up Plan

- 服务器历史趋势与告警
- 邮箱绑定与发送
- 设计艺术字主页

## 🚀 Run Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/`

## 📄 License

This project is for **learning purposes only**. Original design by [Adrian Hajdin](https://github.com/adrianhajdin/award-winning-website). Personal modifications by [@bistutzyy](https://github.com/bistutzyy).

---

> *"这只是个开始 — This is only the beginning."*
