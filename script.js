const photoCount = 38;
const backgroundMusic = document.querySelector("#background-music");
const musicToggle = document.querySelector("#music-toggle");
const track = document.querySelector("#gallery-track");
const viewport = document.querySelector("#gallery-viewport");
const currentLabel = document.querySelector("#current-photo");
let currentIndex = 0;
let dragStart = null;
let autoplayTimer = null;
let galleryIsActive = false;

for (let index = 1; index <= photoCount; index += 1) {
  const figure = document.createElement("figure");
  figure.className = "gallery-slide";
  const image = document.createElement("img");
  image.src = `assets/photos/photo-${String(index).padStart(2, "0")}.jpg`;
  image.alt = `張永宜與柯妮均婚紗照 ${index}`;
  image.loading = index <= 2 ? "eager" : "lazy";
  figure.appendChild(image);
  track.appendChild(figure);
}

const slides = [...document.querySelectorAll(".gallery-slide")];

function showPhoto(index, animate = true) {
  currentIndex = Math.max(0, Math.min(photoCount - 1, index));
  track.style.transitionDuration = animate ? "" : "0s";
  const slide = slides[currentIndex];
  const offset = viewport.clientWidth / 2 - (slide.offsetLeft + slide.offsetWidth / 2);
  track.style.transform = `translate3d(${offset}px,0,0)`;
  slides.forEach((item, itemIndex) => item.classList.toggle("is-current", itemIndex === currentIndex));
  currentLabel.textContent = currentIndex + 1;
}

function startAutoplay() {
  if (autoplayTimer !== null) return;
  autoplayTimer = window.setInterval(() => {
    showPhoto((currentIndex + 1) % photoCount);
  }, 2500);
}

function stopAutoplay() {
  if (autoplayTimer === null) return;
  window.clearInterval(autoplayTimer);
  autoplayTimer = null;
}

const galleryObserver = new IntersectionObserver(([entry]) => {
  galleryIsActive = entry.isIntersecting && entry.intersectionRatio >= 0.55;
  if (galleryIsActive && !document.hidden) {
    startAutoplay();
  } else {
    stopAutoplay();
  }
}, { threshold: [0, 0.55] });

galleryObserver.observe(document.querySelector("#gallery"));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAutoplay(); else if (galleryIsActive) startAutoplay();
});

document.querySelector("#previous-photo").addEventListener("click", () => showPhoto(currentIndex - 1));
document.querySelector("#next-photo").addEventListener("click", () => showPhoto(currentIndex + 1));
viewport.addEventListener("pointerdown", (event) => { stopAutoplay(); dragStart = event.clientX; viewport.classList.add("is-dragging"); viewport.setPointerCapture(event.pointerId); });
viewport.addEventListener("pointerup", (event) => { if (dragStart !== null) { const distance = event.clientX - dragStart; if (Math.abs(distance) > 45) showPhoto(currentIndex + (distance < 0 ? 1 : -1)); } dragStart = null; viewport.classList.remove("is-dragging"); if (galleryIsActive) startAutoplay(); });
viewport.addEventListener("pointercancel", () => { dragStart = null; viewport.classList.remove("is-dragging"); if (galleryIsActive) startAutoplay(); });
window.addEventListener("resize", () => showPhoto(currentIndex, false));
window.addEventListener("load", () => showPhoto(0, false));
showPhoto(0, false);

const musicFadeDuration = 3000;
let musicFadeFrame = null;
let musicFadeTimeout = null;
let mobileAudioContext = null;
let mobileAudioSource = null;
let mobileAudioGain = null;

function isMobileAudioDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function stopMusicFade() {
  if (musicFadeFrame !== null) cancelAnimationFrame(musicFadeFrame);
  if (musicFadeTimeout !== null) clearTimeout(musicFadeTimeout);
  musicFadeFrame = null;
  musicFadeTimeout = null;
  if (mobileAudioGain && mobileAudioContext) {
    mobileAudioGain.gain.cancelScheduledValues(mobileAudioContext.currentTime);
  }
}

async function prepareMobileAudioGain() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  if (!mobileAudioContext) {
    mobileAudioContext = new AudioContextClass();
    mobileAudioSource = mobileAudioContext.createMediaElementSource(backgroundMusic);
    mobileAudioGain = mobileAudioContext.createGain();
    mobileAudioSource.connect(mobileAudioGain);
    mobileAudioGain.connect(mobileAudioContext.destination);
  }
  if (mobileAudioContext.state === "suspended") await mobileAudioContext.resume();
  return mobileAudioContext.state === "running";
}

async function playMusicWithFade() {
  stopMusicFade();
  document.documentElement.dataset.musicFade = "starting";

  if (isMobileAudioDevice()) {
    try {
      if (await prepareMobileAudioGain()) {
        backgroundMusic.volume = 1;
        mobileAudioGain.gain.setValueAtTime(0, mobileAudioContext.currentTime);
        await backgroundMusic.play();
        mobileAudioGain.gain.linearRampToValueAtTime(1, mobileAudioContext.currentTime + musicFadeDuration / 1000);
        document.documentElement.dataset.musicFade = "running";
        musicFadeTimeout = setTimeout(() => { document.documentElement.dataset.musicFade = "complete"; }, musicFadeDuration);
        return;
      }
    } catch {
      // Web Audio 無法啟動時改用一般音訊淡入。
    }
  }

  backgroundMusic.volume = 0;
  await backgroundMusic.play();
  const fadeStartedAt = performance.now();
  document.documentElement.dataset.musicFade = "running";
  const increaseVolume = (now) => {
    const progress = Math.min(1, (now - fadeStartedAt) / musicFadeDuration);
    backgroundMusic.volume = progress;
    document.documentElement.dataset.musicFadeLevel = progress.toFixed(2);
    if (progress < 1 && !backgroundMusic.paused) {
      musicFadeFrame = requestAnimationFrame(increaseVolume);
    } else {
      musicFadeFrame = null;
      document.documentElement.dataset.musicFade = "complete";
    }
  };
  musicFadeFrame = requestAnimationFrame(increaseVolume);
}

musicToggle.addEventListener("click", async () => {
  if (backgroundMusic.paused) {
    try {
      await playMusicWithFade();
    } catch {
      return;
    }
  } else {
    stopMusicFade();
    backgroundMusic.pause();
  }
});

function updateMusicButton() {
  const isPlaying = !backgroundMusic.paused;
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicToggle.setAttribute("aria-label", isPlaying ? "暫停背景音樂" : "播放背景音樂");
  musicToggle.querySelector("span").textContent = isPlaying ? "Ⅱ" : "♫";
  musicToggle.querySelector("em").textContent = isPlaying ? "暫停音樂" : "播放音樂";
}

backgroundMusic.addEventListener("play", updateMusicButton);
backgroundMusic.addEventListener("pause", updateMusicButton);
updateMusicButton();

document.querySelector("#home-button").addEventListener("click", (event) => {
  event.preventDefault();
  history.pushState(null, "", "#home");
  document.querySelector("#home").scrollIntoView({
    behavior: window.matchMedia("(max-width: 640px)").matches ? "auto" : "smooth",
    block: "start"
  });
});

document.querySelectorAll(".cover-menu a").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!window.matchMedia("(max-width: 640px)").matches) return;
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    history.pushState(null, "", link.getAttribute("href"));
    target.scrollIntoView({ behavior: "auto", block: "start" });
  });
});

async function startDefaultMusic(event) {
  if (event?.target?.closest?.("#music-toggle")) return;
  if (!backgroundMusic.paused) {
    removeDefaultMusicListeners();
    return;
  }
  try {
    await playMusicWithFade();
    removeDefaultMusicListeners();
  } catch {
    // 若瀏覽器不接受這次操作，保留監聽並等待下一次有效互動。
  }
}

function removeDefaultMusicListeners() {
  document.removeEventListener("click", startDefaultMusic);
  document.removeEventListener("keydown", startDefaultMusic);
  document.removeEventListener("touchstart", startDefaultMusic);
  document.removeEventListener("touchend", startDefaultMusic);
  document.removeEventListener("pointerdown", startDefaultMusic);
  document.removeEventListener("pointerup", startDefaultMusic);
  window.removeEventListener("wheel", startDefaultMusic);
  window.removeEventListener("scroll", startDefaultMusic);
}

if (!isMobileAudioDevice()) playMusicWithFade().catch(() => {});
document.addEventListener("click", startDefaultMusic);
document.addEventListener("keydown", startDefaultMusic);
document.addEventListener("touchstart", startDefaultMusic, { passive: true });
document.addEventListener("touchend", startDefaultMusic, { passive: true });
document.addEventListener("pointerdown", startDefaultMusic, { passive: true });
document.addEventListener("pointerup", startDefaultMusic, { passive: true });
window.addEventListener("wheel", startDefaultMusic, { passive: true });
window.addEventListener("scroll", startDefaultMusic, { passive: true });
