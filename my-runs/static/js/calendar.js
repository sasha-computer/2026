// Calendar widget for displaying running data
// Renders a month grid with run stats per day

let currentYear;
let currentMonth;
let runsData;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

async function initCalendar() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  runsData = await fetchRuns();
  renderCalendar();
  setupNavigation();
}

function renderCalendar() {
  const container = document.getElementById("calendar");
  container.innerHTML = "";

  for (const day of DAYS) {
    const header = document.createElement("div");
    header.className = "calendar-header";
    header.textContent = day;
    container.appendChild(header);
  }

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    container.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(currentYear, currentMonth, day);
    const cell = document.createElement("div");
    cell.className = "calendar-day";

    const dateDiv = document.createElement("div");
    dateDiv.className = "date";
    dateDiv.textContent = day;
    cell.appendChild(dateDiv);

    if (runsData.has(dateStr)) {
      const run = runsData.get(dateStr);
      const stats = document.createElement("div");
      stats.className = "run-stats";
      stats.innerHTML = `
        <div class="distance">${run.distance} km</div>
        <div>${run.time} min</div>
        <div>${run.pace}/km</div>
      `;
      cell.appendChild(stats);
    }

    container.appendChild(cell);
  }

  document.getElementById("month-label").textContent =
    `${MONTHS[currentMonth]} ${currentYear}`;
}

function formatDate(year, month, day) {
  const m = (month + 1).toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function setupNavigation() {
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");

  function navigate(delta) {
    const d = new Date(currentYear, currentMonth + delta, 1);
    currentYear = d.getFullYear();
    currentMonth = d.getMonth();
    renderCalendar();
    updateButtons();
  }

  function updateButtons() {
    const now = new Date();
    const atStart = currentYear === 2025 && currentMonth === 2;
    const atEnd =
      currentYear === now.getFullYear() && currentMonth === now.getMonth();

    prevBtn.disabled = atStart;
    prevBtn.classList.toggle("disabled", atStart);
    nextBtn.disabled = atEnd;
    nextBtn.classList.toggle("disabled", atEnd);
  }

  prevBtn.addEventListener("click", () => !prevBtn.disabled && navigate(-1));
  nextBtn.addEventListener("click", () => !nextBtn.disabled && navigate(1));
  updateButtons();
}

document.addEventListener("DOMContentLoaded", initCalendar);
