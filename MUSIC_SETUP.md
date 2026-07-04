# 背景音乐设置指南

## 快速开始

1. 准备一个音乐文件（推荐 MP3 格式，文件越小加载越快）
2. 将文件重命名为 `bgm.mp3`
3. 放入 `public/audio/` 目录下
4. 重新启动开发服务器（`npm run dev`）

## 音乐文件建议

- **格式**：MP3（兼容性最好）
- **大小**：建议 < 5MB（加载更快）
- **时长**：2-5 分钟，会自动循环播放
- **风格**：轻音乐、Lo-fi、钢琴曲等轻松风格
- **音量**：建议先调低原文件音量，或让 Hook 自动设为 30% 音量

## 免费音乐资源

如果没有合适的音乐文件，可以从以下网站获取 royalty-free 音乐：

- [Pixabay Music](https://pixabay.com/music/) — 完全免费，无需署名
- [Freesound](https://freesound.org/) — 免费音效和音乐
- [YouTube Audio Library](https://studio.youtube.com/channel/UC...) — YouTube 免费音频库
- [Bensound](https://www.bensound.com/) — 部分免费，需署名

## 自定义音乐路径

如果想用其他文件名或路径，修改 `src/App.tsx` 中的这一行：

```tsx
const { playing, loading, toggle: toggleBGM } = useBGM("/audio/bgm.mp3");
```

改成你的文件路径，例如：

```tsx
const { playing, loading, toggle: toggleBGM } = useBGM("/audio/my-music.mp3");
```

## 功能说明

- 音乐按钮位于页面右下角
- 点击按钮播放/暂停音乐
- 播放时按钮会有跳动的音符动画
- 音乐会自动循环播放
- 首次播放需要用户交互（浏览器自动播放限制）
- 如果音乐文件不存在，按钮会显示禁用状态

## 注意事项

- 音乐文件不要太大，否则首次加载会很慢
- 注意版权问题，确保使用的是可商用的音乐
- 音量已设为 30%，避免过于突兀
