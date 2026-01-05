// Fetches and parses runs.md, aggregates runs by date
// Exports: fetchRuns() -> Promise<Map<string, {distance, time, pace}>>

async function fetchRuns() {
  const response = await fetch("/runs.md");
  const text = await response.text();
  const runs = parseMarkdownTable(text);
  return aggregateByDate(runs);
}

function parseMarkdownTable(text) {
  const lines = text.split("\n");
  const runs = [];
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  for (const line of lines) {
    if (!line.startsWith("|")) continue;

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c);
    if (cells.length < 4) continue;

    const [date, distanceStr, timeStr, paceStr] = cells;
    if (!datePattern.test(date)) continue;

    runs.push({
      date,
      distance: parseFloat(distanceStr),
      time: parseFloat(timeStr),
      pace: paceStr,
    });
  }

  return runs;
}

function aggregateByDate(runs) {
  const map = new Map();

  for (const run of runs) {
    if (map.has(run.date)) {
      const existing = map.get(run.date);
      existing.distance += run.distance;
      existing.time += run.time;
    } else {
      map.set(run.date, {
        distance: run.distance,
        time: run.time,
        pace: null,
      });
    }
  }

  // Recalculate pace for all entries
  for (const [date, data] of map) {
    const paceMinutes = data.time / data.distance;
    const mins = Math.floor(paceMinutes);
    const secs = Math.round((paceMinutes - mins) * 60);
    data.pace = `${mins}:${secs.toString().padStart(2, "0")}`;
    data.distance = Math.round(data.distance * 100) / 100;
    data.time = Math.round(data.time * 10) / 10;
  }

  return map;
}
