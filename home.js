(() => {
  const themeToggle = document.getElementById("theme-toggle");
  const startBtn = document.getElementById("start-webcam");
  const stopBtn = document.getElementById("stop-webcam");
  const webcamVideo = document.getElementById("webcam-preview");
  const webcamStatus = document.getElementById("webcam-status");
  const webcamSkeleton = document.getElementById("webcam-skeleton");
  const webcamShell = document.getElementById("webcam-shell");
  const chartSkeleton = document.getElementById("chart-skeleton");
  const chartShell = document.getElementById("chart-shell");
  const reveals = document.querySelectorAll(".reveal");

  let stream = null;
  let chart = null;
  let confidenceTimer = null;

  const savedTheme = localStorage.getItem("moodlens-theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light";
    themeToggle.setAttribute("aria-label", "Toggle light mode");
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle("dark");
    themeToggle.textContent = isDark ? "Light" : "Dark";
    themeToggle.setAttribute("aria-label", isDark ? "Toggle light mode" : "Toggle dark mode");
    localStorage.setItem("moodlens-theme", isDark ? "dark" : "light");
  }

  function createChart() {
    if (chart || typeof Chart === "undefined") {
      return;
    }
    const canvas = document.getElementById("confidence-chart");
    const ctx = canvas.getContext("2d");
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Confidence %",
            data: [],
            borderColor: "#0b7a75",
            pointBackgroundColor: "#0b7a75",
            pointRadius: 2,
            tension: 0.3,
            fill: false
          }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 100 }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  function appendConfidencePoint() {
    if (!chart) {
      return;
    }
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, minute: "2-digit", second: "2-digit" });
    const last = chart.data.datasets[0].data.at(-1) ?? 72;
    const next = Math.max(40, Math.min(99, last + Math.round((Math.random() - 0.5) * 12)));

    chart.data.labels.push(timestamp);
    chart.data.datasets[0].data.push(next);

    if (chart.data.labels.length > 18) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update("none");
  }

  async function startWebcam() {
    if (!navigator.mediaDevices?.getUserMedia) {
      webcamStatus.textContent = "Webcam API is not supported in this browser.";
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      webcamVideo.srcObject = stream;
      webcamSkeleton.classList.add("hidden");
      webcamShell.classList.remove("hidden");
      chartSkeleton.classList.add("hidden");
      chartShell.classList.remove("hidden");
      webcamStatus.textContent = "Webcam demo is active. Confidence trend is updating.";

      createChart();
      appendConfidencePoint();
      clearInterval(confidenceTimer);
      confidenceTimer = setInterval(appendConfidencePoint, 1200);
    } catch (error) {
      webcamStatus.textContent = "Unable to access webcam. Please allow camera permission.";
    }
  }

  function stopWebcam() {
    if (confidenceTimer) {
      clearInterval(confidenceTimer);
      confidenceTimer = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    webcamVideo.srcObject = null;
    webcamStatus.textContent = "Webcam demo stopped.";
  }

  function setupReveal() {
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((element) => element.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    reveals.forEach((element) => observer.observe(element));
  }

  themeToggle?.addEventListener("click", toggleTheme);
  startBtn?.addEventListener("click", startWebcam);
  stopBtn?.addEventListener("click", stopWebcam);

  window.addEventListener("beforeunload", stopWebcam);

  setupReveal();
})();
