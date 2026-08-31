(() => {
  const AREA_URL = "https://www.jma.go.jp/bosai/common/const/area.json";
  const WARNING_BASE = "https://www.jma.go.jp/bosai/warning/data/warning/";
  const INTERVAL = 10 * 60 * 1000;
  const STORAGE_KEY = "kawanobe-jma-area";
  const areaSelect = document.getElementById("jma-area");
  const refreshButton = document.getElementById("jma-refresh");
  const status = document.getElementById("jma-status");
  const headline = document.getElementById("jma-headline");
  const meta = document.getElementById("jma-meta");

  function setState(kind, message) {
    status.className = "jma-status" + (kind ? " " + kind : "");
    status.textContent = message;
  }

  function formatDate(value) {
    if (!value) return "時刻不明";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric", month: "numeric", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).format(new Date(value));
  }

  async function loadAreas() {
    const response = await fetch(AREA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("地域一覧を取得できませんでした");
    const data = await response.json();
    const offices = Object.entries(data.offices || {})
      .map(([code, item]) => ({ code, name: item.name }))
      .filter(item => item.name)
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    const saved = localStorage.getItem(STORAGE_KEY) || "130000";
    areaSelect.replaceChildren(...offices.map(item => {
      const option = document.createElement("option");
      option.value = item.code;
      option.textContent = item.name;
      option.selected = item.code === saved;
      return option;
    }));
    if (!areaSelect.value && offices.length) areaSelect.value = offices[0].code;
  }

  async function updateWarning() {
    const code = areaSelect.value || "130000";
    const areaName = areaSelect.options[areaSelect.selectedIndex]?.text || "選択地域";
    setState("loading", "気象庁から最新情報を取得しています");
    refreshButton.disabled = true;

    try {
      const response = await fetch(WARNING_BASE + encodeURIComponent(code) + ".json?_=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("気象情報を取得できませんでした");
      const data = await response.json();
      const message = (data.headlineText || "").trim();
      headline.textContent = message || areaName + "に発表中の警報・注意報の見出し情報はありません。";
      meta.textContent = "発表：" + formatDate(data.reportDatetime) + " ／ " + (data.publishingOffice || "気象庁") + "　｜　画面更新：" + formatDate(new Date());
      setState("", "最新情報を表示中（次回は10分以内に更新）");
    } catch (error) {
      headline.textContent = "現在、気象庁の情報を取得できません。時間をおいて再度お試しください。";
      meta.textContent = "";
      setState("error", "取得に失敗しました");
    } finally {
      refreshButton.disabled = false;
    }
  }

  areaSelect.addEventListener("change", () => {
    localStorage.setItem(STORAGE_KEY, areaSelect.value);
    updateWarning();
  });
  refreshButton.addEventListener("click", updateWarning);

  loadAreas()
    .catch(() => setState("error", "地域一覧を取得できませんでした"))
    .finally(updateWarning);

  window.setInterval(updateWarning, INTERVAL);
})();
