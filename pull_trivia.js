const fs = require('fs');
const path = require('path');
const https = require('https');

// OpenTDB API Rate limit: 1 request per 5 seconds is recommended to avoid IP bans, 
// but we'll use 2 seconds to be safe. We will pull 40 batches of 50 questions (2000 questions).
const BATCHES = 40;
const DELAY_MS = 2000;

// Mapping OpenTDB categories to our 13 subjects
function mapCategory(category) {
  if (category.includes('Science: Mathematics')) return 'Mathematics';
  if (category.includes('Science: Computers') || category.includes('Gadgets')) return 'Technology';
  if (category.includes('Science') || category.includes('Animals')) return 'Science';
  if (category.includes('History')) return 'History';
  if (category.includes('Geography')) return 'Geography';
  if (category.includes('Sports')) return 'Sports';
  if (category.includes('Art') || category.includes('Books') || category.includes('Mythology')) return 'Literature';
  if (category.includes('Entertainment') || category.includes('Celebrities')) return 'Pop Culture';
  if (category.includes('Politics') || category.includes('Vehicles')) return 'General Knowledge';
  return 'General Knowledge'; // Fallback
}

// Decode HTML entities
function decodeHtml(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&hellip;/g, '...')
    .replace(/&shy;/g, '')
    .replace(/&oacute;/g, 'ó')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&aacute;/g, 'á')
    .replace(/&ntilde;/g, 'ñ');
}

function fetchTrivia(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log(`Starting to pull ${BATCHES * 50} questions...`);
  let allQuestions = [];
  
  for (let i = 0; i < BATCHES; i++) {
    try {
      const data = await fetchTrivia('https://opentdb.com/api.php?amount=50&type=multiple');
      if (data.response_code === 0 && data.results) {
        data.results.forEach(q => {
          const formatted = {
            q: decodeHtml(q.question),
            options: [decodeHtml(q.correct_answer), ...q.incorrect_answers.map(decodeHtml)],
            answer: 0,
            subject: mapCategory(q.category)
          };
          // Shuffle options for the final array
          const shuffled = [...formatted.options];
          for (let k = shuffled.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            [shuffled[k], shuffled[j]] = [shuffled[j], shuffled[k]];
          }
          formatted.answer = shuffled.indexOf(formatted.options[0]);
          formatted.options = shuffled;
          
          allQuestions.push(formatted);
        });
        console.log(`Batch ${i+1}/${BATCHES} success. Collected ${allQuestions.length} total.`);
      } else {
        console.log(`Batch ${i+1}/${BATCHES} rate limited or failed. Waiting...`);
      }
    } catch (e) {
      console.log(`Batch ${i+1} error:`, e.message);
    }
    
    // Wait before next request
    if (i < BATCHES - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // Read existing file
  const filePath = path.join(__dirname, 'lib', 'triviaQuestions.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // Generate JS code for new questions
  const newCode = allQuestions.map(q => 
    `  { q: ${JSON.stringify(q.q)}, options: ${JSON.stringify(q.options)}, answer: ${q.answer}, subject: '${q.subject}' },`
  ).join('\n');

  // Insert into TRIVIA_QUESTIONS array
  const targetStr = `export const TRIVIA_QUESTIONS: TriviaQuestion[] = [`;
  if (content.includes(targetStr)) {
    content = content.replace(targetStr, `${targetStr}\n  // ── Auto-pulled Questions ──\n${newCode}\n`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully appended ${allQuestions.length} new questions to triviaQuestions.ts!`);
  } else {
    console.log('Failed to find TRIVIA_QUESTIONS array in file.');
  }
}

run();
