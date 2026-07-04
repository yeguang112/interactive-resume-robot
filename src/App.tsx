import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBGM } from "@/lib/useBGM";
import ChatBot from "@/components/ChatBot";
import ChatPanel from "@/components/ChatPanel";
import MusicButton from "@/components/MusicButton";
import ButterflyCursor from "@/components/ButterflyCursor";

const Spline = lazy(() => import("@splinetool/react-spline"));
const AdminPanel = lazy(() => import("@/components/AdminPanel"));
const sceneUrl = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

const nameTop = ["I", "'", "M", " ", " ", "M", "A"];
const nameBottom = "马承旭".split("");

const marqueeItems = [
  "AI WORKFLOW",
  "GET REQUEST",
  "AUTO LOGIN",
  "VISUAL IP",
  "SPACE DESIGN",
  "ARCHITECTURE",
  "CODEX",
  "CLAUDE CODE",
  "PROMPT DESIGN",
  "PUBLISHING",
  "SHENZHEN UNIVERSITY",
  "CAMPUS OPS",
  "NON-HERITAGE"
];

const skillGroups = [
  {
    tag: "AI Tools / Workflow",
    color: "neon",
    items: ["ChatGPT", "Gemini", "Claude", "Claude Code", "Codex", "Cursor", "Perplexity", "Midjourney", "ComfyUI", "Prompt Design", "需求拆解", "方案推演"]
  },
  {
    tag: "Automation / Scripts",
    color: "magenta",
    items: ["Python", "TypeScript", "Vite", "GET 请求分析", "URL 参数提取", "自动认证", "RDP / SSH", "脚本化工作流"]
  },
  {
    tag: "Visual / IP",
    color: "violet",
    items: ["空竹非遗", "IP 形象", "Logo / 海报", "周边物料", "公众号视觉", "信息排版"]
  },
  {
    tag: "Space / Research",
    color: "acid",
    items: ["建筑学", "环境设计", "空间叙事", "视觉文化", "场景研究", "用户体验"]
  }
];

const experiences = [
  {
    period: "2024.09 - 至今",
    role: "深圳大学 · 建筑学",
    org: "研究生阶段",
    desc: "继续把空间、视觉、技术表达放在同一个问题里思考，关注建筑学训练如何转译成产品判断。"
  },
  {
    period: "2020.09 - 2024.06",
    role: "北方工业大学 · 环境设计（空间设计）",
    org: "本科阶段",
    desc: "建立了空间设计、视觉表达、调研分析与方案呈现能力，也为后续的视觉与产品实践打下基础。"
  },
  {
    period: "2021.09 - 2022.06",
    role: "校团委宣传部",
    org: "视觉运营",
    desc: "负责学校校团委公众号宣传图制作与运营，训练了面向真实受众的信息表达和视觉传达。"
  },
  {
    period: "2020.09 - 2024.06",
    role: "校话剧队",
    org: "表演经历",
    desc: "参演多个话剧表演，获得北京大学生舞蹈节三等奖，让我对叙事、节奏和现场感更敏感。"
  }
];

const projects = [
  {
    no: "P-01",
    title: "校园网自动登录工具",
    stack: "Python / GET / Auto Login",
    desc: "通过分析校园网 GET 请求中的 URL 参数，生成自动认证脚本，实现开机即联网，解决远程桌面和 SSH 因掉线中断的问题。",
    accent: "#7df9ff"
  },
  {
    no: "P-02",
    title: "空竹非遗文创 IP 设计",
    stack: "Research / IP / Visual System",
    desc: "围绕空竹非遗历史与技艺做文化洞察，提炼“轻盈、传承、童趣”的核心价值，完成 IP 形象、Logo、海报与周边物料。",
    accent: "#ff2d92"
  },
  {
    no: "P-03",
    title: "校团委公众号视觉运营",
    stack: "Content / Visual Design / Ops",
    desc: "负责学校校团委公众号的宣传图制作与运营，把校园内容转成更有识别度和传播力的视觉表达。",
    accent: "#c8ff00"
  },
  {
    no: "P-04",
    title: "建筑学与空间表达研究",
    stack: "Architecture / Spatial Design",
    desc: "把建筑学的空间秩序、动线和场景感带回产品思考，训练自己在复杂信息中保持结构与节奏。",
    accent: "#8b5cf6"
  }
];

interface SpotlightProps {
  className?: string;
  fill?: string;
}

function Spotlight({ className = "", fill = "white" }: SpotlightProps) {
  return (
    <svg className={cn("pointer-events-none absolute animate-spotlight opacity-0", className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3787 2842" fill="none" aria-hidden="true">
      <g filter="url(#filter)">
        <ellipse cx="1924.71" cy="273.501" rx="1924.71" ry="273.501" transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)" fill={fill} fillOpacity="0.22" />
      </g>
      <defs>
        <filter id="filter" x="0.860352" y="0.838989" width="3785.16" height="2840.26" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur_1065_8" />
        </filter>
      </defs>
    </svg>
  );
}

function LoadingScene() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <div className="grid place-items-center gap-4 text-white/70">
        <Loader2 className="h-10 w-10 animate-spin" />
        <span className="text-xs font-black uppercase tracking-[0.38em]">Loading 3D scene</span>
      </div>
    </div>
  );
}

function RobotBackground({ chatMode, onClick }: { chatMode: boolean; onClick: () => void }) {
  return (
    <motion.div
      animate={{
        width: "100%",
        height: "100vh",
      }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed inset-0 z-0 overflow-hidden bg-black text-white",
        !chatMode && "cursor-pointer"
      )}
      onClick={chatMode ? undefined : onClick}
    >
      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,.16),transparent_34%),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:auto,86px_86px,86px_86px]" />
      <Spotlight className="-top-40 left-0 h-[76rem] w-[76rem] md:left-60 md:-top-20" fill="white" />

      {/* Spline scene - zoom to show upper body, shift left to make room for chat card */}
      <motion.div
        animate={{
          scale: chatMode ? 1.35 : 1,
          x: chatMode ? "-18%" : "0%",
          y: chatMode ? "5%" : "0%",
        }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0"
      >
        <Suspense fallback={<LoadingScene />}>
          <Spline scene={sceneUrl} className="h-full w-full" />
        </Suspense>
      </motion.div>

      {/* Intro mode: click hint */}
      <AnimatePresence>
        {!chatMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-12 left-1/2 z-20 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30">
                click to activate
              </span>
              <div className="flex h-8 w-5 items-start justify-center rounded-full border border-white/15 p-1">
                <motion.div
                  animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="h-1.5 w-1.5 rounded-full bg-white/50"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Cursor() {
  const x = useSpring(-100, { stiffness: 900, damping: 45 });
  const y = useSpring(-100, { stiffness: 900, damping: 45 });
  const ringX = useSpring(x, { stiffness: 150, damping: 18, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 150, damping: 18, mass: 0.6 });
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      const target = event.target as HTMLElement;
      setHovering(Boolean(target.closest("a, button, [data-hover]")));
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] hidden md:block">
      <motion.div className="absolute h-2 w-2 rounded-full bg-[var(--neon)] mix-blend-difference" style={{ x, y, translateX: "-50%", translateY: "-50%" }} />
      <motion.div
        className="absolute rounded-full border border-[var(--magenta)] mix-blend-difference"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{ width: hovering ? 56 : 32, height: hovering ? 56 : 32, opacity: hovering ? 1 : 0.6 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
    </div>
  );
}

function Nav({ chatMode, onBack, musicButton }: { chatMode: boolean; onBack: () => void; musicButton?: ReactNode }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 90, damping: 26 });
  const links = [
    ["about", "#about"],
    ["skills", "#skills"],
    ["work", "#projects"],
    ["contact", "#contact"],
  ];

  return (
    <>
      <motion.div style={{ scaleX }} className="fixed left-0 top-0 z-[70] h-[2px] w-full origin-left bg-gradient-to-r from-[#7df9ff] via-[#8b5cf6] to-[#ff2d92]" />
      <motion.nav initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 2.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="pointer-events-auto fixed right-6 top-5 z-[70] flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.25em] md:right-14">
        {chatMode ? (
          <button
            onClick={onBack}
            data-hover
            className="group flex items-center gap-2 text-[var(--magenta)] transition-colors hover:text-white"
          >
            <motion.span
              initial={{ x: 0 }}
              whileHover={{ x: -3 }}
              className="inline-block"
            >
              {"<-"}
            </motion.span>
            <span className="text-white/50">返回</span>
          </button>
        ) : (
          links.map(([label, href]) => (
            <a key={label} href={href} data-hover className="glitch text-white/50 transition-colors hover:text-[var(--neon)]">
              {label}
            </a>
          ))
        )}
        {musicButton}
      </motion.nav>
    </>
    );
  }

function Reveal({ children, delay = 0, direction = "up", className = "" }: { children: ReactNode; delay?: number; direction?: "up" | "left" | "right" | "skew"; className?: string }) {
  const variants = {
    up: { hidden: { opacity: 0, y: 80 }, show: { opacity: 1, y: 0 } },
    left: { hidden: { opacity: 0, x: -90, rotate: -2 }, show: { opacity: 1, x: 0, rotate: 0 } },
    right: { hidden: { opacity: 0, x: 90, rotate: 2 }, show: { opacity: 1, x: 0, rotate: 0 } },
    skew: { hidden: { opacity: 0, y: 60, skewY: 6, scale: 0.96 }, show: { opacity: 1, y: 0, skewY: 0, scale: 1 } }
  }[direction];

  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={variants} transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

function Marquee({ reverse = false }: { reverse?: boolean }) {
  const row = [...marqueeItems, ...marqueeItems];
  return (
    <div className="pointer-events-none relative overflow-hidden border-y border-white/10 bg-black/10 py-3 backdrop-blur-[2px]">
      <div className={cn("flex w-max whitespace-nowrap", reverse ? "animate-marquee-reverse" : "animate-marquee")}>
        {row.map((item, index) => (
          <span key={`${item}-${index}`} className="mx-6 font-display text-sm font-bold uppercase tracking-[0.35em] text-white/30">
            {item} <span className="mx-4 text-[var(--magenta)]">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yTitle = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const yChip = useTransform(scrollYProgress, [0, 1], [0, 170]);
  const opacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);

  return (
    <section ref={ref} id="top" className="relative min-h-screen overflow-hidden px-6 pt-14 pb-8 md:px-14 md:pt-16">
      <motion.div style={{ opacity }} className="pointer-events-none relative z-10 flex min-h-[calc(100vh-5.5rem)] flex-col justify-between">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">
          <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
            Shenzhen, CN / 2002
          </motion.span>
          <motion.span initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="pulse-glow rounded-full border border-[var(--neon)]/40 px-3 py-1 text-[var(--neon)]">
            open to work
          </motion.span>
        </div>

        <motion.div style={{ y: yTitle }} className="resume-hero-grid select-none">
          <h1 className="font-display font-bold leading-[0.85]">
            <span className="block overflow-hidden text-[18vw] md:text-[10.5vw]">
              {nameTop.map((letter, index) => (
                <motion.span key={letter + index} className={cn("inline-block", index >= 5 && "gradient-text", letter === " " && "w-[0.18em]")} initial={{ y: "110%", rotate: 8 }} animate={{ y: 0, rotate: 0 }} transition={{ delay: 0.5 + index * 0.06, duration: 1, ease: [0.16, 1, 0.3, 1] }}>
                  {letter}
                </motion.span>
              ))}
            </span>
            <span className="block overflow-hidden text-[18vw] md:text-[10.5vw]">
              {nameBottom.map((letter, index) => (
                <motion.span key={letter + index} className="text-stroke inline-block" initial={{ y: "110%", rotate: -8 }} animate={{ y: 0, rotate: 0 }} transition={{ delay: 0.8 + index * 0.06, duration: 1, ease: [0.16, 1, 0.3, 1] }}>
                  {letter}
                </motion.span>
              ))}
            </span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 1 }} className="self-end font-mono text-sm leading-7 text-white/66 md:max-w-[36rem] md:text-base md:leading-8">
            <span className="gradient-text font-bold">AI 工具工作流</span> / 建筑学研究生 / 视觉与空间设计背景。把 Codex、Claude Code、ChatGPT、Gemini 等工具接入调研、写作、编码、脚本和视觉表达流程。
          </motion.p>
        </motion.div>

        <motion.div style={{ y: yChip }} className="flex items-end justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
            scroll to dissolve {"->"}
          </motion.span>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="pointer-events-auto flex gap-4">
            <a href="#projects" data-hover className="glitch text-[var(--neon)]">Projects</a>
            <a href="#contact" data-hover className="glitch text-[var(--magenta)]">Contact</a>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="resume-section py-28 md:py-36">
      <div>
        <Reveal direction="left">
          <p className="resume-kicker text-[var(--neon)]">01 / profile · 个人切片</p>
          <h2 className="resume-title mt-4">我是马承旭，<span className="gradient-text">一个有审美判断的 AI 工具探索者。</span></h2>
        </Reveal>
      </div>

      <div className="space-y-6 font-mono text-sm leading-7 text-white/65 md:text-[15px] md:leading-8">
        <Reveal direction="right" delay={0.1}>
          <p>我来自安徽芜湖，2002 年生，目前在深圳大学读建筑学研究生。本科的空间设计训练让我对秩序、比例和视觉表达敏感，而 AI 工具让我能把想法更快推到可验证的文本、脚本、界面和视觉方案里。</p>
        </Reveal>
        <Reveal direction="right" delay={0.2}>
          <p>我更像一个把审美、空间感和 AI 工具串起来的人：用 ChatGPT、Gemini、Claude 梳理问题，用 Codex、Claude Code、Cursor 做代码和页面实验，也用 Perplexity、Midjourney、ComfyUI 做调研、视觉探索和内容生产。</p>
        </Reveal>
        <Reveal direction="right" delay={0.3}>
          <p>我希望别人记住我的不是一个标签，而是一种工作方式：有审美，愿意试工具，能把复杂信息拆开，再重新组织成有画面、有结构、能落地的表达。</p>
        </Reveal>
        <Reveal direction="up" delay={0.4}>
          <div className="grid grid-cols-3 gap-4 pt-6">
            {[["2002", "Born in Wuhu"], ["SZU", "Architecture M.S."], ["AI", "tool workflow"]].map(([big, small]) => (
              <div key={big} data-hover className="pointer-events-auto group border border-white/10 p-4 transition-colors hover:border-[var(--magenta)]/60">
                <div className="font-display text-2xl font-bold text-white group-hover:text-[var(--magenta)] md:text-3xl">{big}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-white/40">{small}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section id="skills" className="resume-section py-32 md:py-40">
      <div>
        <Reveal>
          <p className="resume-kicker text-[var(--magenta)]">02 / arsenal · AI 工具箱</p>
          <h2 className="resume-title mt-4">I make <span className="text-stroke-neon">ideas</span> usable</h2>
        </Reveal>
      </div>

      <div className="space-y-12">
        {skillGroups.map((group, groupIndex) => (
          <Reveal key={group.tag} direction={groupIndex % 2 === 0 ? "left" : "right"} delay={groupIndex * 0.05}>
            <div className="grid gap-4 md:grid-cols-[190px_1fr]">
              <span className={`skill-tag ${group.color}`}>{group.tag}</span>
              <div className="flex flex-wrap gap-3">
                {group.items.map((item, itemIndex) => (
                  <motion.span key={item} data-hover initial={{ opacity: 0, scale: 0.7, rotate: -4 }} whileInView={{ opacity: 1, scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ delay: itemIndex * 0.05, type: "spring", stiffness: 260, damping: 14 }} whileHover={{ scale: 1.12, rotate: itemIndex % 2 ? 2 : -2, backgroundColor: "rgba(125,249,255,0.08)" }} className="pointer-events-auto border border-white/15 px-4 py-2 font-display text-sm font-medium text-white/80">
                    {item}
                  </motion.span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Experience() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 40%"] });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="experience" className="resume-section py-32 md:py-40">
      <div>
        <Reveal>
          <p className="resume-kicker text-[var(--violet)]">03 / trajectory · 走过的路</p>
          <h2 className="resume-title mt-4">Where I&apos;ve <span className="text-stroke">been</span></h2>
        </Reveal>
      </div>

      <div ref={ref} className="relative pl-8 md:pl-14">
        <div className="absolute left-2 top-0 h-full w-px bg-white/10 md:left-4" />
        <motion.div style={{ height: lineHeight }} className="absolute left-2 top-0 w-px bg-gradient-to-b from-[#7df9ff] via-[#8b5cf6] to-[#ff2d92] md:left-4" />
        <div className="space-y-16">
          {experiences.map((item, index) => (
            <Reveal key={item.role} direction={index % 2 === 0 ? "right" : "left"}>
              <div className="relative">
                <span className="absolute -left-[2.05rem] top-2 h-2.5 w-2.5 rounded-full bg-[var(--neon)] shadow-[0_0_12px_#7df9ff] md:-left-[3.55rem]" />
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">{item.period}</p>
                <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">{item.role}</h3>
                <p className="mt-1 font-mono text-sm text-[var(--magenta)]">{item.org}</p>
                <p className="mt-3 max-w-2xl font-mono text-sm leading-7 text-white/60">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Projects() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section id="projects" className="resume-section py-32 md:py-40">
      <div>
        <Reveal>
          <p className="resume-kicker text-[var(--acid)]">04 / selected work · 做过的事</p>
          <h2 className="resume-title mt-4">Projects that <span className="gradient-text">matter</span></h2>
        </Reveal>
      </div>

      <div>
        {projects.map((project, index) => (
          <Reveal key={project.no} delay={index * 0.04} direction="skew">
            <motion.div data-hover onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onClick={() => setActive(active === index ? null : index)} className="pointer-events-auto group relative cursor-none border-b border-white/10 py-7 md:py-8">
              <div className="flex items-baseline justify-between gap-6">
                <div className="flex items-baseline gap-5 md:gap-8">
                  <span className="font-mono text-xs" style={{ color: project.accent }}>{project.no}</span>
                  <motion.h3 animate={{ x: active === index ? 18 : 0, color: active === index ? project.accent : "#ece8f4" }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="font-display text-xl font-bold md:text-3xl">
                    {project.title}
                  </motion.h3>
                </div>
                <span className="hidden shrink-0 font-mono text-[11px] uppercase tracking-widest text-white/35 md:block">{project.stack}</span>
              </div>

              <AnimatePresence>
                {active === index && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                    <p className="max-w-3xl pt-4 font-mono text-sm leading-7 text-white/60 md:pl-[4.5rem]">{project.desc}</p>
                    <p className="pt-2 font-mono text-[11px] uppercase tracking-widest text-white/35 md:hidden">{project.stack}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div className="absolute bottom-0 left-0 h-px" style={{ background: project.accent }} animate={{ width: active === index ? "100%" : "0%" }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden py-32 md:py-44">
      <div className="resume-contact mx-auto max-w-6xl px-6 text-center md:px-14">
        <Reveal>
          <p className="resume-kicker text-[var(--neon)]">05 / transmission · 来联系我吧</p>
        </Reveal>
        <Reveal direction="skew" delay={0.1}>
          <h2 className="mt-6 font-display text-[13vw] font-bold leading-[0.9] md:text-[8vw]">LET&apos;S <span className="gradient-text">TALK</span><br /><span className="text-stroke">ABOUT</span> WORK</h2><p className="mx-auto mt-6 max-w-2xl font-mono text-sm leading-7 text-white/58 md:text-base">来联系我吧，聊聊 AI 工具、视觉表达，或者一个可以被快速做出来的想法。</p>
        </Reveal>
        <Reveal delay={0.25}>
          <motion.a href="mailto:2676177514@qq.com" data-hover whileHover={{ scale: 1.06, rotate: -1 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 280, damping: 16 }} className="pointer-events-auto mt-12 inline-block border border-[var(--neon)]/50 bg-[rgba(125,249,255,0.05)] px-10 py-5 font-display text-lg font-bold text-[var(--neon)] backdrop-blur transition-colors hover:bg-[rgba(125,249,255,0.15)] md:text-xl">
            2676177514@qq.com {"->"}
          </motion.a>
        </Reveal>
        <Reveal delay={0.35}>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 font-mono text-xs uppercase tracking-[0.25em] text-white/45">
            <span className="text-[var(--magenta)]">/</span>
            <span>+86 186 0963 9125</span>
            <span className="text-[var(--magenta)]">/</span>
            <span>shenzhen, china</span>
            <span className="text-[var(--magenta)]">/</span>
            <span>ai tool workflow</span>
          </div>
        </Reveal>
      </div>
      <footer className="relative mt-28 border-t border-white/10 pt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/25">&copy; 2026 Ma Chengxu - designed as a personal art portfolio</footer>
    </section>
  );
}

export default function App() {
  const [chatMode, setChatMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { playing, loading, error, currentIndex, tracks, toggle: toggleBGM, nextTrack, prevTrack, selectTrack } = useBGM();

  useEffect(() => {
    // 检测 ?admin=1 参数
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "1") {
      setIsAdmin(true);
    }
  }, []);

  // 管理后台模式 — 完全独立渲染，不影响主页
  if (isAdmin) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/30" />
          </div>
        }
      >
        <AdminPanel onBack={() => {
          setIsAdmin(false);
          // 清除 URL 中的 admin 参数
          const url = new URL(window.location.href);
          url.searchParams.delete("admin");
          window.history.pushState({}, "", url.toString());
        }} />
      </Suspense>
    );
  }

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.stopPropagation();
    };

    window.addEventListener("wheel", handleWheel, { capture: true, passive: true });
    return () => window.removeEventListener("wheel", handleWheel, { capture: true });
  }, []);

  function activateChat() {
    if (!chatMode) {
      setChatMode(true);
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function deactivateChat() {
    setChatMode(false);
  }

  return (
    <main className="grain relative min-h-screen bg-transparent text-[#ece8f4]">
      <RobotBackground chatMode={chatMode} onClick={activateChat} />
      <ButterflyCursor />
      <Nav chatMode={chatMode} onBack={deactivateChat} musicButton={
        <MusicButton
          playing={playing}
          loading={loading}
          error={error}
          currentIndex={currentIndex}
          tracks={tracks}
          onToggle={toggleBGM}
          onNext={nextTrack}
          onPrev={prevTrack}
          onSelect={selectTrack}
        />
      } />

      <AnimatePresence mode="wait">
        {chatMode ? (
          /* ===== CHAT MODE: card overlay ===== */
          <motion.div
            key="chat-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none relative z-10 flex h-screen items-center justify-end px-4 md:px-12 lg:px-20"
          >
            {/* Floating chat card - adaptive width */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="pointer-events-auto h-[85vh] w-full max-w-[92vw] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(5,5,8,0.9)] shadow-2xl shadow-black/60 backdrop-blur-2xl md:w-[380px] lg:w-[420px]"
            >
              <ChatPanel onClose={deactivateChat} />
            </motion.div>
          </motion.div>
        ) : (
          /* ===== INTRO MODE ===== */
          <motion.div
            key="intro-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none relative z-10"
          >
            <Hero />
            <Marquee />
            <About />
            <div className="h-line mx-auto max-w-6xl" />
            <Skills />
            <Marquee reverse />
            <Experience />
            <div className="h-line mx-auto max-w-6xl" />
            <Projects />
            <Contact />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating chat button - only in intro mode */}
      {!chatMode && <ChatBot />}
    </main>
  );
}











