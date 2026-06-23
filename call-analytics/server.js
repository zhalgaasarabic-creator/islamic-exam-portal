const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

const SIPUNI_HASH = process.env.SIPUNI_HASH || '9256a87b61d9a6dcf738e2cc838f1e38';
const DATA_FILE = path.join(__dirname, 'data', 'calls_cache.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sipuni API-ден деректерді алу
async function fetchSipuniData(dateFrom, dateTo) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      hash: SIPUNI_HASH,
      date_from: dateFrom || getDateDaysAgo(30),
      date_to: dateTo || getTodayDate(),
      format: 'json'
    });

    const url = `https://api.sipuni.com/v1/statistics/calls?${params.toString()}`;

    const options = {
      hostname: 'api.sipuni.com',
      path: `/v1/statistics/calls?${params.toString()}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CallAnalytics/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve({ raw: data, error: 'parse_error' });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Sipuni статистика бетін scraping арқылы алу
async function fetchSipuniStats(dateFrom, dateTo) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      hash: SIPUNI_HASH,
      date_from: dateFrom || getDateDaysAgo(30),
      date_to: dateTo || getTodayDate(),
    });

    const options = {
      hostname: 'stats.sipuni.com',
      path: `/ru_RU/statistic/export?hash=${SIPUNI_HASH}&date_from=${dateFrom || getDateDaysAgo(30)}&date_to=${dateTo || getTodayDate()}&format=csv`,
      method: 'GET',
      headers: {
        'Accept': 'text/csv,application/json,*/*',
        'User-Agent': 'Mozilla/5.0 CallAnalytics/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// CSV-ді парсинг жасау
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });
      rows.push(row);
    }
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

// Demo деректер (реал API жұмыс істемесе)
function generateDemoData(dateFrom, dateTo) {
  const operators = ['Айгерім', 'Нұрлан', 'Дина', 'Бауыржан', 'Мадина'];
  const calls = [];
  const start = new Date(dateFrom);
  const end = new Date(dateTo);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Демалыс

    const callsCount = Math.floor(Math.random() * 30) + 10;

    for (let i = 0; i < callsCount; i++) {
      const hour = Math.floor(Math.random() * 9) + 9; // 9-18
      const minute = Math.floor(Math.random() * 60);
      const operator = operators[Math.floor(Math.random() * operators.length)];
      const duration = Math.floor(Math.random() * 600) + 30; // 30 сек - 10 мин
      const types = ['incoming', 'outgoing', 'missed'];
      const typeWeights = [0.5, 0.35, 0.15];
      let type = 'incoming';
      const r = Math.random();
      if (r < typeWeights[0]) type = 'incoming';
      else if (r < typeWeights[0] + typeWeights[1]) type = 'outgoing';
      else type = 'missed';

      const dateStr = d.toISOString().split('T')[0];
      calls.push({
        id: calls.length + 1,
        date: dateStr,
        time: `${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}`,
        datetime: `${dateStr}T${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}:00`,
        operator,
        type,
        duration: type === 'missed' ? 0 : duration,
        phone: `+7 7${Math.floor(Math.random()*9)+1}${Math.floor(10000000 + Math.random()*89999999)}`,
        status: type === 'missed' ? 'missed' : (duration > 0 ? 'answered' : 'missed')
      });
    }
  }

  return calls.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
}

// Аналитика есептеу
function computeAnalytics(calls) {
  const total = calls.length;
  const incoming = calls.filter(c => c.type === 'incoming').length;
  const outgoing = calls.filter(c => c.type === 'outgoing').length;
  const missed = calls.filter(c => c.type === 'missed' || c.status === 'missed').length;
  const answered = calls.filter(c => c.status === 'answered' || (c.type !== 'missed' && c.duration > 0)).length;

  const durations = calls.filter(c => c.duration > 0).map(c => c.duration);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const totalDuration = durations.reduce((a, b) => a + b, 0);

  // Операторлар бойынша статистика
  const byOperator = {};
  calls.forEach(c => {
    const op = c.operator || 'Белгісіз';
    if (!byOperator[op]) {
      byOperator[op] = { name: op, total: 0, incoming: 0, outgoing: 0, missed: 0, totalDuration: 0, calls: [] };
    }
    byOperator[op].total++;
    byOperator[op][c.type]++;
    byOperator[op].totalDuration += c.duration || 0;
    byOperator[op].calls.push(c);
  });

  Object.values(byOperator).forEach(op => {
    const answered = op.calls.filter(c => c.duration > 0).length;
    op.answerRate = op.total > 0 ? Math.round((answered / op.total) * 100) : 0;
    op.avgDuration = answered > 0
      ? Math.round(op.calls.filter(c => c.duration > 0).reduce((a, c) => a + c.duration, 0) / answered)
      : 0;
    delete op.calls;
  });

  // Күн бойынша статистика
  const byDate = {};
  calls.forEach(c => {
    const date = c.date;
    if (!byDate[date]) byDate[date] = { date, total: 0, incoming: 0, outgoing: 0, missed: 0 };
    byDate[date].total++;
    byDate[date][c.type]++;
  });

  // Сағат бойынша статистика (жұмыс уақыты)
  const byHour = {};
  for (let h = 0; h < 24; h++) byHour[h] = { hour: h, total: 0 };
  calls.forEach(c => {
    const hour = parseInt((c.time || '00:00').split(':')[0]);
    if (byHour[hour]) byHour[hour].total++;
  });

  return {
    summary: { total, incoming, outgoing, missed, answered, avgDuration, totalDuration,
      answerRate: total > 0 ? Math.round(((total - missed) / total) * 100) : 0 },
    byOperator: Object.values(byOperator).sort((a, b) => b.total - a.total),
    byDate: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
    byHour: Object.values(byHour),
    recentCalls: calls.slice(0, 50)
  };
}

// Кэш файлынан оқу
function loadCache() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

// Кэшке сақтау
function saveCache(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ timestamp: Date.now(), data }, null, 2));
  } catch (e) {}
}

// API endpoints
app.get('/api/analytics', async (req, res) => {
  const { date_from, date_to, refresh } = req.query;
  const from = date_from || getDateDaysAgo(30);
  const to = date_to || getTodayDate();

  try {
    // Реал Sipuni-ден деректер алуға тырысу
    let calls = null;

    const result = await fetchSipuniStats(from, to).catch(() => null);

    if (result && result.status === 200 && result.data && result.data.length > 100) {
      calls = parseCSV(result.data);
    }

    // Егер реал деректер болмаса — demo деректер
    if (!calls || calls.length === 0) {
      calls = generateDemoData(from, to);
    }

    const analytics = computeAnalytics(calls);
    saveCache({ calls, analytics, dateFrom: from, dateTo: to });

    res.json({ success: true, dateFrom: from, dateTo: to, source: calls[0]?.id ? 'sipuni' : 'demo', ...analytics });
  } catch (err) {
    // Кэшті пайдалану
    const cache = loadCache();
    if (cache) {
      return res.json({ success: true, source: 'cache', ...cache.data.analytics });
    }

    // Соңғы шара — demo
    const calls = generateDemoData(from, to);
    const analytics = computeAnalytics(calls);
    res.json({ success: true, source: 'demo', dateFrom: from, dateTo: to, ...analytics });
  }
});

app.get('/api/sync', async (req, res) => {
  const { date_from, date_to } = req.query;
  const from = date_from || getDateDaysAgo(30);
  const to = date_to || getTodayDate();

  try {
    const result = await fetchSipuniStats(from, to);
    let calls;

    if (result.status === 200 && result.data) {
      calls = parseCSV(result.data);
      if (calls.length === 0) calls = generateDemoData(from, to);
    } else {
      calls = generateDemoData(from, to);
    }

    const analytics = computeAnalytics(calls);
    saveCache({ calls, analytics, dateFrom: from, dateTo: to });

    res.json({ success: true, synced: calls.length, source: result.status === 200 ? 'sipuni' : 'demo' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/calls', async (req, res) => {
  const cache = loadCache();
  if (cache) {
    res.json({ success: true, calls: cache.data.calls || [] });
  } else {
    const calls = generateDemoData(getDateDaysAgo(30), getTodayDate());
    res.json({ success: true, calls });
  }
});

app.listen(PORT, () => {
  console.log(`Call Analytics сервері ${PORT} портта іске қосылды`);
  console.log(`Сілтеме: http://localhost:${PORT}`);
});
