const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL database configuration
let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  // Initialize PostgreSQL tables
  const initDB = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS results (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          group_name VARCHAR(100) NOT NULL,
          book VARCHAR(100) NOT NULL,
          score INTEGER NOT NULL,
          total INTEGER NOT NULL,
          percent INTEGER NOT NULL,
          date VARCHAR(100) NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tulga_participants (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          group_name VARCHAR(200) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tulga_submissions (
          participant_id VARCHAR(50) NOT NULL,
          day VARCHAR(20) NOT NULL,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (participant_id, day)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tulga_scorecards (
          participant_id VARCHAR(50) NOT NULL,
          module VARCHAR(100) NOT NULL,
          scores JSONB NOT NULL DEFAULT '{}'::jsonb,
          total INTEGER NOT NULL DEFAULT 0,
          note TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (participant_id, module)
        )
      `);
      console.log("PostgreSQL tables initialized successfully!");
    } catch (err) {
      console.error("Error initializing PostgreSQL tables:", err);
    }
  };
  initDB();
}

// Database File Paths
const DB_FILE = path.join(__dirname, 'db.json');
const QUESTIONS_FILE = path.join(__dirname, 'questions_db.json');

// TULGA project data files
const TULGA_PARTICIPANTS_FILE = path.join(__dirname, 'tulga_participants.json');
const TULGA_SUBMISSIONS_FILE = path.join(__dirname, 'tulga_submissions.json');
const TULGA_SCORECARDS_FILE = path.join(__dirname, 'tulga_scorecards.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// On serverless platforms (e.g. Vercel) the deployed filesystem is read-only,
// so these bootstrap writes are best-effort: JSON-file storage only matters
// for local/dev use without DATABASE_URL, and must never crash the app.
try {
  // Ensure db.json exists
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
  }

  // Ensure TULGA data files exist
  [TULGA_PARTICIPANTS_FILE, TULGA_SUBMISSIONS_FILE, TULGA_SCORECARDS_FILE].forEach((file) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify([], null, 2), 'utf8');
    }
  });

  // Ensure questions_db.json exists, otherwise initialize it from questions.js
  if (!fs.existsSync(QUESTIONS_FILE)) {
    try {
      const defaultQuestions = require('./questions.js');
      fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(defaultQuestions, null, 2), 'utf8');
      console.log("Initialized questions_db.json from questions.js successfully!");
    } catch (e) {
      console.error("Failed to initialize questions from questions.js:", e);
      fs.writeFileSync(QUESTIONS_FILE, JSON.stringify([], null, 2), 'utf8');
    }
  }
} catch (err) {
  console.warn("Read-only filesystem detected — JSON-file storage is disabled (set DATABASE_URL for persistence):", err.message);
}

// --- UTILITIES FOR persistent STORE ---

// Read student results
const readDB = () => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return [];
  }
};

// Write student results
const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
};

// Read questions
const readQuestions = () => {
  try {
    const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading questions:", error);
    return [];
  }
};

// Write questions
const writeQuestions = (data) => {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing questions:", error);
    return false;
  }
};

// Generic JSON file store (used by the TULGA project)
const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error("Error reading " + file + ":", error);
    return [];
  }
};

const writeJSON = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing " + file + ":", error);
    return false;
  }
};


// --- API ENDPOINTS ---

// 1. GET ALL RESULTS
app.get('/api/results', async (req, res) => {
  if (pool) {
    try {
      const dbRes = await pool.query('SELECT * FROM results');
      const mapped = dbRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        group: r.group_name,
        book: r.book,
        score: r.score,
        total: r.total,
        percent: r.percent,
        date: r.date
      }));
      return res.json(mapped);
    } catch (err) {
      console.error("Error reading from PostgreSQL:", err);
      return res.status(500).json({ error: "Деректерді оқу қатесі: " + err.message });
    }
  }
  const results = readDB();
  res.json(results);
});

// 2. SAVE NEW RESULT
app.post('/api/results', async (req, res) => {
  const { name, group, book, score, total, percent } = req.body;
  
  if (!name || !group || score === undefined || total === undefined) {
    return res.status(400).json({ error: "Қажетті өрістерді толтырыңыз (name, group, score, total)" });
  }

  const id = Date.now().toString();
  const calculatedPercent = parseInt(percent) || Math.round((score / total) * 100);
  const date = new Date().toLocaleString('kk-KZ', { timeZone: 'Asia/Almaty' });

  if (pool) {
    try {
      await pool.query(
        'INSERT INTO results (id, name, group_name, book, score, total, percent, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, name, group, book || "mix", parseInt(score), parseInt(total), calculatedPercent, date]
      );
      return res.status(201).json({ message: "Нәтиже сәтті сақталды", result: { id, name, group, book: book || "mix", score, total, percent: calculatedPercent, date } });
    } catch (err) {
      console.error("Error writing to PostgreSQL:", err);
      return res.status(500).json({ error: "Деректерді сақтау қатесі: " + err.message });
    }
  }

  const results = readDB();
  const newResult = {
    id,
    name,
    group,
    book: book || "mix",
    score: parseInt(score),
    total: parseInt(total),
    percent: calculatedPercent,
    date
  };

  results.push(newResult);
  
  if (writeDB(results)) {
    res.status(201).json({ message: "Нәтиже сәтті сақталды", result: newResult });
  } else {
    res.status(500).json({ error: "Деректерді сақтау кезінде сервер қатесі орын алды" });
  }
});

// 3. DELETE A SPECIFIC RESULT
app.delete('/api/results/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      await pool.query('DELETE FROM results WHERE id = $1', [id]);
      return res.json({ message: "Нәтиже тізімнен өшірілді" });
    } catch (err) {
      console.error("Error deleting from PostgreSQL:", err);
      return res.status(500).json({ error: "Деректерді өшіру қатесі: " + err.message });
    }
  }

  let results = readDB();
  const initialLength = results.length;
  results = results.filter(r => r.id !== id);
  
  if (results.length === initialLength) {
    return res.status(404).json({ error: "Бұл идентификатормен нәтиже табылдады" });
  }

  if (writeDB(results)) {
    res.json({ message: "Нәтиже тізімнен өшірілді" });
  } else {
    res.status(500).json({ error: "Деректерді өшіру кезінде қате орын алды" });
  }
});

// 4. CLEAR ALL RESULTS
app.delete('/api/results', async (req, res) => {
  if (pool) {
    try {
      await pool.query('DELETE FROM results');
      return res.json({ message: "Барлық шәкірттер нәтижелері сәтті тазартылды" });
    } catch (err) {
      console.error("Error clearing PostgreSQL table:", err);
      return res.status(500).json({ error: "Базаны тазарту қатесі: " + err.message });
    }
  }

  if (writeDB([])) {
    res.json({ message: "Барлық шәкірттер нәтижелері сәтті тазартылды" });
  } else {
    res.status(500).json({ error: "Базаны тазарту кезінде қате орын алды" });
  }
});

// 5. GET ALL EXAM QUESTIONS (DYNAMIC)
app.get('/api/questions', (req, res) => {
  const list = readQuestions();
  res.json(list);
});

// 6. UPDATE A SPECIFIC QUESTION
app.put('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  const { question, options, correctAnswer, explanation, topic, reference } = req.body;
  
  let list = readQuestions();
  const index = list.findIndex(q => q.id.toString() === id.toString());
  
  if (index === -1) {
    return res.status(404).json({ error: "Бұл идентификатормен сұрақ табылмады" });
  }

  // Update fields
  if (question) list[index].question = question;
  if (options && Array.isArray(options) && options.length === 4) list[index].options = options;
  if (correctAnswer !== undefined) list[index].correctAnswer = parseInt(correctAnswer);
  if (explanation !== undefined) list[index].explanation = explanation;
  if (topic) list[index].topic = topic;
  if (reference !== undefined) list[index].reference = reference;

  if (writeQuestions(list)) {
    res.json({ message: "Сұрақ сәтті жаңартылды", question: list[index] });
  } else {
    res.status(500).json({ error: "Деректерді сақтау кезінде сервер қатесі орын алды" });
  }
});

// --- TULGA PROJECT ENDPOINTS ---
// Backed by PostgreSQL when DATABASE_URL is set; falls back to JSON files
// for local/dev use (not durable on serverless platforms like Vercel).

// 7. REGISTER / RESUME A TULGA PARTICIPANT
app.post('/api/tulga/participants', async (req, res) => {
  const { name, group } = req.body;
  if (!name || !group) {
    return res.status(400).json({ error: "Аты-жөні мен тобын толтырыңыз" });
  }
  const trimmedName = name.trim();
  const trimmedGroup = group.trim();

  if (pool) {
    try {
      const existing = await pool.query(
        'SELECT * FROM tulga_participants WHERE LOWER(name) = LOWER($1) AND LOWER(group_name) = LOWER($2) LIMIT 1',
        [trimmedName, trimmedGroup]
      );
      if (existing.rows.length) {
        const r = existing.rows[0];
        return res.status(201).json({ id: r.id, name: r.name, group: r.group_name, createdAt: r.created_at });
      }
      const id = Date.now().toString();
      const inserted = await pool.query(
        'INSERT INTO tulga_participants (id, name, group_name) VALUES ($1, $2, $3) RETURNING *',
        [id, trimmedName, trimmedGroup]
      );
      const r = inserted.rows[0];
      return res.status(201).json({ id: r.id, name: r.name, group: r.group_name, createdAt: r.created_at });
    } catch (err) {
      console.error("Error registering TULGA participant in PostgreSQL:", err);
      return res.status(500).json({ error: "Тіркеу кезінде дерекқор қатесі: " + err.message });
    }
  }

  const participants = readJSON(TULGA_PARTICIPANTS_FILE);
  const normalizedName = trimmedName.toLowerCase();
  const normalizedGroup = trimmedGroup.toLowerCase();

  let participant = participants.find(
    (p) => p.name.trim().toLowerCase() === normalizedName && p.group.trim().toLowerCase() === normalizedGroup
  );

  if (!participant) {
    participant = {
      id: Date.now().toString(),
      name: trimmedName,
      group: trimmedGroup,
      createdAt: new Date().toISOString()
    };
    participants.push(participant);
    if (!writeJSON(TULGA_PARTICIPANTS_FILE, participants)) {
      return res.status(500).json({ error: "Тіркеу кезінде сервер қатесі орын алды" });
    }
  }

  res.status(201).json(participant);
});

// 8. LIST ALL TULGA PARTICIPANTS (mentor dashboard)
app.get('/api/tulga/participants', async (req, res) => {
  if (pool) {
    try {
      const dbRes = await pool.query('SELECT * FROM tulga_participants ORDER BY created_at ASC');
      return res.json(dbRes.rows.map((r) => ({ id: r.id, name: r.name, group: r.group_name, createdAt: r.created_at })));
    } catch (err) {
      console.error("Error listing TULGA participants from PostgreSQL:", err);
      return res.status(500).json({ error: "Деректерді оқу қатесі: " + err.message });
    }
  }
  res.json(readJSON(TULGA_PARTICIPANTS_FILE));
});

// 9. SAVE / UPDATE A DAY'S SUBMISSION (upsert by participantId + day)
app.post('/api/tulga/submissions', async (req, res) => {
  const { participantId, day, data } = req.body;
  if (!participantId || !day) {
    return res.status(400).json({ error: "participantId және day өрістері қажет" });
  }

  if (pool) {
    try {
      const upserted = await pool.query(
        `INSERT INTO tulga_submissions (participant_id, day, data, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (participant_id, day) DO UPDATE SET data = $3, updated_at = now()
         RETURNING *`,
        [participantId, day, JSON.stringify(data || {})]
      );
      const r = upserted.rows[0];
      return res.status(200).json({ participantId: r.participant_id, day: r.day, data: r.data, updatedAt: r.updated_at });
    } catch (err) {
      console.error("Error saving TULGA submission to PostgreSQL:", err);
      return res.status(500).json({ error: "Сақтау кезінде дерекқор қатесі: " + err.message });
    }
  }

  const submissions = readJSON(TULGA_SUBMISSIONS_FILE);
  const index = submissions.findIndex((s) => s.participantId === participantId && s.day === day);
  const record = {
    participantId,
    day,
    data: data || {},
    updatedAt: new Date().toISOString()
  };

  if (index === -1) {
    submissions.push(record);
  } else {
    submissions[index] = record;
  }

  if (writeJSON(TULGA_SUBMISSIONS_FILE, submissions)) {
    res.status(200).json(record);
  } else {
    res.status(500).json({ error: "Сақтау кезінде сервер қатесі орын алды" });
  }
});

// 10. GET ALL SUBMISSIONS FOR ONE PARTICIPANT, KEYED BY DAY
app.get('/api/tulga/submissions/:participantId', async (req, res) => {
  const { participantId } = req.params;

  if (pool) {
    try {
      const dbRes = await pool.query('SELECT day, data FROM tulga_submissions WHERE participant_id = $1', [participantId]);
      const byDay = {};
      dbRes.rows.forEach((r) => { byDay[r.day] = r.data; });
      return res.json(byDay);
    } catch (err) {
      console.error("Error reading TULGA submissions from PostgreSQL:", err);
      return res.status(500).json({ error: "Деректерді оқу қатесі: " + err.message });
    }
  }

  const submissions = readJSON(TULGA_SUBMISSIONS_FILE).filter((s) => s.participantId === participantId);
  const byDay = {};
  submissions.forEach((s) => { byDay[s.day] = s.data; });
  res.json(byDay);
});

// 11. SAVE / UPDATE A MENTOR SCORECARD (upsert by participantId + module)
app.post('/api/tulga/scorecard', async (req, res) => {
  const { participantId, module, scores, total, note } = req.body;
  if (!participantId || !module) {
    return res.status(400).json({ error: "participantId және module өрістері қажет" });
  }

  if (pool) {
    try {
      const upserted = await pool.query(
        `INSERT INTO tulga_scorecards (participant_id, module, scores, total, note, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (participant_id, module) DO UPDATE SET scores = $3, total = $4, note = $5, updated_at = now()
         RETURNING *`,
        [participantId, module, JSON.stringify(scores || {}), total || 0, note || ""]
      );
      const r = upserted.rows[0];
      return res.status(200).json({ participantId: r.participant_id, module: r.module, scores: r.scores, total: r.total, note: r.note, updatedAt: r.updated_at });
    } catch (err) {
      console.error("Error saving TULGA scorecard to PostgreSQL:", err);
      return res.status(500).json({ error: "Сақтау кезінде дерекқор қатесі: " + err.message });
    }
  }

  const scorecards = readJSON(TULGA_SCORECARDS_FILE);
  const index = scorecards.findIndex((s) => s.participantId === participantId && s.module === module);
  const record = {
    participantId,
    module,
    scores: scores || {},
    total: total || 0,
    note: note || "",
    updatedAt: new Date().toISOString()
  };

  if (index === -1) {
    scorecards.push(record);
  } else {
    scorecards[index] = record;
  }

  if (writeJSON(TULGA_SCORECARDS_FILE, scorecards)) {
    res.status(200).json(record);
  } else {
    res.status(500).json({ error: "Сақтау кезінде сервер қатесі орын алды" });
  }
});

// 12. GET A PARTICIPANT'S SCORECARD
app.get('/api/tulga/scorecard/:participantId', async (req, res) => {
  const { participantId } = req.params;

  if (pool) {
    try {
      const dbRes = await pool.query('SELECT * FROM tulga_scorecards WHERE participant_id = $1 LIMIT 1', [participantId]);
      if (!dbRes.rows.length) return res.json({});
      const r = dbRes.rows[0];
      return res.json({ participantId: r.participant_id, module: r.module, scores: r.scores, total: r.total, note: r.note, updatedAt: r.updated_at });
    } catch (err) {
      console.error("Error reading TULGA scorecard from PostgreSQL:", err);
      return res.status(500).json({ error: "Деректерді оқу қатесі: " + err.message });
    }
  }

  const scorecards = readJSON(TULGA_SCORECARDS_FILE);
  const record = scorecards.find((s) => s.participantId === participantId);
  res.json(record || {});
});

// Serve frontend fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server (skipped when imported as a serverless function, e.g. on Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🕌 Ислами Емтихан Порталы сәтті іске қосылды!`);
    console.log(`====================================================`);
    console.log(`💻 Сервер сіздің компьютеріңізде істеп тұр:`);
    console.log(`   👉 http://localhost:${PORT}`);
    console.log(``);
    console.log(`📱 Студенттер өз телефондарынан кіруі үшін`);
    console.log(`   мына сілтемелердің бірін жіберіңіз (бір желіде болса):`);

    // Print out local network IP addresses
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`   👉 http://${net.address}:${PORT}`);
        }
      }
    }
    console.log(`====================================================`);
  });
}

module.exports = app;
