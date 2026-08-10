import { pool } from '../lib/db/src/index.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function seedCurriculumData() {
  log('\n🌱 Starting Curriculum Data Seeding...', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  try {
    // Get Class 11 Physics subject
    const subjectResult = await pool.query(`
      SELECT s.id, s.name, c.name as class_name
      FROM subjects s
      JOIN classes c ON c.id = s.class_id
      WHERE s.name ILIKE '%physics%' 
      AND c.name ILIKE '%11%'
      LIMIT 1
    `);
    
    if (subjectResult.rows.length === 0) {
      log('❌ No Physics Class 11 subject found. Creating it...', colors.yellow);
      
      // Get or create Class 11
      let classResult = await pool.query(`SELECT id FROM classes WHERE name ILIKE '%11%' LIMIT 1`);
      let classId;
      
      if (classResult.rows.length === 0) {
        const newClass = await pool.query(`
          INSERT INTO classes (name, description, order_index)
          VALUES ('Class 11', 'Intermediate Part 1', 11)
          RETURNING id
        `);
        classId = newClass.rows[0].id;
        log(`✅ Created Class 11 (ID: ${classId})`, colors.green);
      } else {
        classId = classResult.rows[0].id;
      }
      
      // Create Physics subject
      const newSubject = await pool.query(`
        INSERT INTO subjects (class_id, name, description, order_index)
        VALUES ($1, 'Physics', 'Physics for Class 11', 1)
        RETURNING id
      `, [classId]);
      
      const subjectId = newSubject.rows[0].id;
      log(`✅ Created Physics subject (ID: ${subjectId})`, colors.green);
      
      subjectResult.rows = [{ id: subjectId, name: 'Physics', class_name: 'Class 11' }];
    }
    
    const subject = subjectResult.rows[0];
    log(`\n📚 Using Subject: ${subject.class_name} - ${subject.name} (ID: ${subject.id})`, colors.blue);
    
    // Get or create a chapter
    let chapterResult = await pool.query(`
      SELECT id, name FROM chapters 
      WHERE subject_id = $1 
      LIMIT 1
    `, [subject.id]);
    
    let chapterId;
    if (chapterResult.rows.length === 0) {
      const newChapter = await pool.query(`
        INSERT INTO chapters (subject_id, name, description, order_index, chapter_number)
        VALUES ($1, 'Measurements', 'Physical Quantities, SI Units, Significant Figures', 0, 1)
        RETURNING id, name
      `, [subject.id]);
      chapterId = newChapter.rows[0].id;
      log(`✅ Created Chapter: ${newChapter.rows[0].name} (ID: ${chapterId})`, colors.green);
    } else {
      chapterId = chapterResult.rows[0].id;
      log(`📖 Using existing Chapter: ${chapterResult.rows[0].name} (ID: ${chapterId})`, colors.blue);
    }
    
    // Seed Topics
    log('\n📁 Seeding Topics...', colors.cyan);
    
    const topics = [
      { name: 'Physical Quantities', description: 'Base and derived quantities, scalar and vector' },
      { name: 'SI Units', description: 'International System of Units' },
      { name: 'Significant Figures', description: 'Rules for significant figures and rounding' },
      { name: 'Errors and Uncertainties', description: 'Types of errors, accuracy and precision' },
      { name: 'Measuring Instruments', description: 'Vernier caliper, micrometer, etc.' },
    ];
    
    const topicIds: number[] = [];
    
    for (const topic of topics) {
      const result = await pool.query(`
        INSERT INTO topics (subject_id, chapter_id, name, description, order_index)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [subject.id, chapterId, topic.name, topic.description, topicIds.length]);
      
      if (result.rows.length > 0) {
        topicIds.push(result.rows[0].id);
        log(`  ✅ ${topic.name} (ID: ${result.rows[0].id})`, colors.green);
      } else {
        // Topic might already exist, get its ID
        const existing = await pool.query(`
          SELECT id FROM topics 
          WHERE chapter_id = $1 AND name = $2
        `, [chapterId, topic.name]);
        
        if (existing.rows.length > 0) {
          topicIds.push(existing.rows[0].id);
          log(`  ⚠️  ${topic.name} already exists (ID: ${existing.rows[0].id})`, colors.yellow);
        }
      }
    }
    
    // Seed Subtopics
    if (topicIds.length > 0) {
      log('\n📂 Seeding Subtopics...', colors.cyan);
      
      const subtopics = [
        { parentIdx: 0, name: 'Base Quantities', description: 'Length, mass, time, etc.' },
        { parentIdx: 0, name: 'Derived Quantities', description: 'Speed, force, energy, etc.' },
        { parentIdx: 0, name: 'Scalar Quantities', description: 'Quantities with magnitude only' },
        { parentIdx: 0, name: 'Vector Quantities', description: 'Quantities with magnitude and direction' },
        { parentIdx: 2, name: 'Rules for Counting', description: 'Non-zero digits, zeros, etc.' },
        { parentIdx: 2, name: 'Rounding Off', description: 'Rules for rounding numbers' },
      ];
      
      for (const subtopic of subtopics) {
        const parentId = topicIds[subtopic.parentIdx];
        const result = await pool.query(`
          INSERT INTO topics (subject_id, chapter_id, parent_id, name, description, order_index)
          VALUES ($1, $2, $3, $4, $5, 0)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [subject.id, chapterId, parentId, subtopic.name, subtopic.description]);
        
        if (result.rows.length > 0) {
          log(`    ↳ ${subtopic.name} (ID: ${result.rows[0].id})`, colors.green);
        }
      }
    }
    
    // Seed Notes
    log('\n📝 Seeding Notes...', colors.cyan);
    
    if (topicIds.length > 0) {
      const notes = [
        {
          topicId: topicIds[0],
          title: 'Introduction to Physical Quantities',
          content: `# Physical Quantities

A **physical quantity** is a quantity that can be measured and expressed numerically.

## Types of Physical Quantities

1. **Base Quantities**: Fundamental quantities that cannot be derived from other quantities
   - Length (meter, m)
   - Mass (kilogram, kg)
   - Time (second, s)
   - Electric current (ampere, A)
   - Temperature (kelvin, K)
   - Amount of substance (mole, mol)
   - Luminous intensity (candela, cd)

2. **Derived Quantities**: Quantities obtained from base quantities
   - Area (m²)
   - Volume (m³)
   - Speed (m/s)
   - Force (N = kg·m/s²)
   - Energy (J = kg·m²/s²)

## Scalar vs Vector

- **Scalar**: Magnitude only (e.g., mass, temperature, energy)
- **Vector**: Magnitude and direction (e.g., velocity, force, acceleration)`,
          noteType: 'markdown',
          tags: ['physics', 'measurements', 'physical-quantities']
        },
        {
          topicId: topicIds[1],
          title: 'SI Units Reference Table',
          content: `# SI Units (International System of Units)

## Base Units

| Quantity | Unit | Symbol |
|----------|------|--------|
| Length | meter | m |
| Mass | kilogram | kg |
| Time | second | s |
| Electric Current | ampere | A |
| Temperature | kelvin | K |
| Amount of Substance | mole | mol |
| Luminous Intensity | candela | cd |

## Common Derived Units

| Quantity | Unit | Symbol | In Base Units |
|----------|------|--------|---------------|
| Frequency | hertz | Hz | s⁻¹ |
| Force | newton | N | kg·m·s⁻² |
| Energy | joule | J | kg·m²·s⁻² |
| Power | watt | W | kg·m²·s⁻³ |
| Pressure | pascal | Pa | kg·m⁻¹·s⁻² |

## Prefixes

- **nano (n)**: 10⁻⁹
- **micro (μ)**: 10⁻⁶
- **milli (m)**: 10⁻³
- **centi (c)**: 10⁻²
- **kilo (k)**: 10³
- **mega (M)**: 10⁶
- **giga (G)**: 10⁹`,
          noteType: 'markdown',
          tags: ['physics', 'si-units', 'reference']
        },
        {
          topicId: topicIds[2],
          title: 'Significant Figures Rules',
          content: `# Significant Figures

## Rules for Counting Significant Figures

1. **All non-zero digits are significant**
   - 123 has 3 sig figs
   - 4.56 has 3 sig figs

2. **Zeros between non-zero digits are significant**
   - 1002 has 4 sig figs
   - 50.03 has 4 sig figs

3. **Leading zeros are NOT significant**
   - 0.0025 has 2 sig figs
   - 0.100 has 3 sig figs

4. **Trailing zeros after decimal are significant**
   - 12.00 has 4 sig figs
   - 100.0 has 4 sig figs

5. **Trailing zeros without decimal are ambiguous**
   - 1200 could be 2, 3, or 4 sig figs
   - Use scientific notation: 1.2 × 10³ (2 sig figs)

## Rounding Rules

- If digit to be dropped < 5: round down
- If digit to be dropped > 5: round up
- If digit to be dropped = 5: round to nearest even number

## Examples

- 3.1416 → 3.14 (3 sig figs)
- 0.002547 → 0.0025 (2 sig figs)
- 123.45 → 123 (3 sig figs)`,
          noteType: 'markdown',
          tags: ['physics', 'significant-figures', 'mathematics']
        }
      ];
      
      for (const note of notes) {
        const result = await pool.query(`
          INSERT INTO notes (topic_id, title, content, note_type, tags)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          RETURNING id
        `, [note.topicId, note.title, note.content, note.noteType, JSON.stringify(note.tags)]);
        
        log(`  ✅ ${note.title} (ID: ${result.rows[0].id})`, colors.green);
      }
    }
    
    // Seed Sample MCQs with Options
    log('\n🎯 Seeding MCQs with Options...', colors.cyan);
    
    if (topicIds.length > 0) {
      const mcqs = [
        {
          topicId: topicIds[0],
          questionText: 'Which of the following is a base quantity?',
          options: [
            { key: 'A', text: 'Force', isCorrect: false },
            { key: 'B', text: 'Length', isCorrect: true },
            { key: 'C', text: 'Velocity', isCorrect: false },
            { key: 'D', text: 'Energy', isCorrect: false }
          ],
          difficulty: 'easy',
          sourceType: 'textbook',
          sourceName: 'Physics XI Textbook',
          pageNumber: 15
        },
        {
          topicId: topicIds[0],
          questionText: 'Which of the following is a vector quantity?',
          options: [
            { key: 'A', text: 'Mass', isCorrect: false },
            { key: 'B', text: 'Time', isCorrect: false },
            { key: 'C', text: 'Velocity', isCorrect: true },
            { key: 'D', text: 'Temperature', isCorrect: false }
          ],
          difficulty: 'easy',
          sourceType: 'textbook',
          sourceName: 'Physics XI Textbook',
          pageNumber: 18
        },
        {
          topicId: topicIds[1],
          questionText: 'What is the SI unit of force?',
          options: [
            { key: 'A', text: 'Joule', isCorrect: false },
            { key: 'B', text: 'Newton', isCorrect: true },
            { key: 'C', text: 'Watt', isCorrect: false },
            { key: 'D', text: 'Pascal', isCorrect: false }
          ],
          difficulty: 'easy',
          sourceType: 'textbook',
          sourceName: 'Physics XI Textbook',
          pageNumber: 22
        },
        {
          topicId: topicIds[2],
          questionText: 'How many significant figures are in 0.00450?',
          options: [
            { key: 'A', text: '2', isCorrect: false },
            { key: 'B', text: '3', isCorrect: true },
            { key: 'C', text: '5', isCorrect: false },
            { key: 'D', text: '6', isCorrect: false }
          ],
          difficulty: 'medium',
          sourceType: 'board_paper',
          sourceName: 'Sindh Board',
          pageNumber: null
        }
      ];
      
      // Get a section to link questions to (for backwards compatibility)
      const sectionResult = await pool.query(`
        SELECT id FROM sections 
        WHERE chapter_id = $1 
        LIMIT 1
      `, [chapterId]);
      
      let sectionId = null;
      if (sectionResult.rows.length > 0) {
        sectionId = sectionResult.rows[0].id;
      } else {
        // Create a default section
        const newSection = await pool.query(`
          INSERT INTO sections (chapter_id, name, section_type, order_index)
          VALUES ($1, 'MCQs', 'mcqs', 0)
          RETURNING id
        `, [chapterId]);
        sectionId = newSection.rows[0].id;
      }
      
      for (const mcq of mcqs) {
        // Insert question
        const questionResult = await pool.query(`
          INSERT INTO questions (section_id, topic_id, question_type, question_text, difficulty)
          VALUES ($1, $2, 'mcq', $3, $4)
          RETURNING id
        `, [sectionId, mcq.topicId, mcq.questionText, mcq.difficulty]);
        
        const questionId = questionResult.rows[0].id;
        log(`  ✅ MCQ: ${mcq.questionText.substring(0, 50)}... (ID: ${questionId})`, colors.green);
        
        // Insert options
        for (const option of mcq.options) {
          await pool.query(`
            INSERT INTO mcq_options (question_id, option_key, option_text, is_correct)
            VALUES ($1, $2, $3, $4)
          `, [questionId, option.key, option.text, option.isCorrect]);
        }
        log(`     Added ${mcq.options.length} options`, colors.blue);
        
        // Insert source
        if (mcq.sourceType) {
          await pool.query(`
            INSERT INTO question_sources (question_id, source_type, source_name, page_number)
            VALUES ($1, $2, $3, $4)
          `, [questionId, mcq.sourceType, mcq.sourceName, mcq.pageNumber]);
          log(`     Added source: ${mcq.sourceName}`, colors.blue);
        }
      }
    }
    
    // Final Statistics
    log('\n📊 Seeding Complete! Final Statistics:', colors.cyan);
    log('='.repeat(60), colors.cyan);
    
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM topics WHERE is_archived = false) as total_topics,
        (SELECT COUNT(*) FROM topics WHERE parent_id IS NULL AND is_archived = false) as root_topics,
        (SELECT COUNT(*) FROM topics WHERE parent_id IS NOT NULL AND is_archived = false) as subtopics,
        (SELECT COUNT(*) FROM notes WHERE is_archived = false) as total_notes,
        (SELECT COUNT(*) FROM questions WHERE question_type = 'mcq' AND is_archived = false) as total_mcqs,
        (SELECT COUNT(*) FROM mcq_options) as total_options
    `);
    
    const s = stats.rows[0];
    log(`✅ Total Topics: ${s.total_topics} (${s.root_topics} root, ${s.subtopics} subtopics)`, colors.green);
    log(`✅ Total Notes: ${s.total_notes}`, colors.green);
    log(`✅ Total MCQs: ${s.total_mcqs}`, colors.green);
    log(`✅ Total MCQ Options: ${s.total_options}`, colors.green);
    
    log('\n🎉 Seed data created successfully!', colors.green);
    log('='.repeat(60), colors.cyan);
    
  } catch (error) {
    log(`\n❌ Seeding failed: ${error}`, colors.red);
    console.error(error);
  } finally {
    await pool.end();
  }
}

seedCurriculumData();
