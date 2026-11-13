// -----------------------------------------------------------------------
// Data injected from the extension (via INJECT_DATA script block)
// Expects: TABLES, CMD_NAME, FILE_NAME
// -----------------------------------------------------------------------

const vscode = acquireVsCodeApi();

// Human-readable labels and descriptions for each CLAN analysis command.
const COMMAND_INFO = {
    freq:    { label: 'Frequency',             desc: 'Word and morpheme frequency distribution' },
    mlu:     { label: 'Mean Length Utterance', desc: 'MLU-w and MLU-m computed per speaker' },
    mlt:     { label: 'Mean Length Turn',      desc: 'Average turn length across speakers' },
    wdlen:   { label: 'Word Length',           desc: 'Distribution of word lengths in characters' },
    wdsize:  { label: 'Word Size',             desc: 'Character length histogram from %mor stems' },
    maxwd:   { label: 'Maximum Words',         desc: 'Longest utterances ranked by speaker' },
    freqpos: { label: 'Frequency by Position', desc: 'Word frequency per utterance position' },
    timedur: { label: 'Time Duration',         desc: 'Utterance timing and duration statistics' },
    kwal:    { label: 'KWAL Search',           desc: 'Keyword-in-context concordance search' },
    combo:   { label: 'Combination Search',    desc: 'Multi-word pattern co-occurrence' },
    gemlist: { label: 'Gem List',              desc: 'Utterances within gem segments' },
    cooccur: { label: 'Co-occurrence',         desc: 'Word and morpheme co-occurrence matrix' },
    dist:    { label: 'Distribution',          desc: 'Frequency distribution across speakers' },
    chip:    { label: 'CHIP Analysis',         desc: 'Contingent imitation and prompt analysis' },
    phonfreq: { label: 'Phonological Frequency', desc: 'Phonological segment frequency from %pho tier' },
    modrep:   { label: 'Model & Replica',        desc: 'Model utterance and child replica analysis' },
    vocd:     { label: 'Vocabulary Diversity',    desc: 'D statistic for lexical diversity' },
    codes:    { label: 'Code Frequency',          desc: 'Frequency counts of coding tier codes' },
    complexity: { label: 'Syntactic Complexity',   desc: 'Complexity ratio from %gra dependency relations' },
    corelex:  { label: 'Core Vocabulary',          desc: 'Words above frequency threshold' },
    chains:   { label: 'Code Chains',             desc: 'Sequential chains of codes on %cod tier' },
    dss:      { label: 'Dev. Sentence Score',     desc: 'Developmental Sentence Scoring per speaker' },
    eval:     { label: 'Language Evaluation',     desc: 'Combined evaluation: MLU, TTR, DSS, IPSyn' },
    flucalc:  { label: 'Fluency Calculation',     desc: 'Disfluency measures and fluency ratios' },
    ipsyn:    { label: 'Index of Prod. Syntax',   desc: 'IPSyn score from morphosyntactic analysis' },
    keymap:   { label: 'Keyword Contingency',     desc: 'Contingency table of keyword codes' },
    kideval:  { label: 'Child Evaluation',        desc: 'DSS + IPSyn + MLU combined child measures' },
    mortable: { label: 'Morpheme Table',          desc: 'Morpheme frequency by POS script categories' },
    rely:     { label: 'Inter-rater Reliability', desc: 'Agreement and kappa between two coded files' },
    script:   { label: 'Script Comparison',       desc: 'Transcript vs template word count comparison' },
    sugar:    { label: 'SUGAR Analysis',          desc: 'Grammatical analysis of sampled utterances' },
    trnfix:   { label: 'Tier Comparison',         desc: 'Mismatches between two dependent tiers' },
    uniq:     { label: 'Unique Utterances',       desc: 'Repeated and unique utterance detection' },
};

// Six accent colours drawn from VS Code's syntax-highlight palette.
const ACCENT_COLORS = [
    '#4ec9b0',  // teal
    '#ce9178',  // rust / salmon
    '#569cd6',  // cornflower blue
    '#dcdcaa',  // khaki / gold
    '#c586c0',  // lavender
    '#9cdcfe',  // sky blue
];

const MAX_ROWS = 200;

// -- Header ---------------------------------------------------------------
const info = COMMAND_INFO[CMD_NAME] || { label: CMD_NAME.toUpperCase(), desc: '' };
document.getElementById('cmd-eyebrow').textContent = 'CLAN Analysis \u00b7 ' + CMD_NAME;
document.getElementById('cmd-display').textContent = info.label;
document.getElementById('cmd-description').textContent = info.desc;
document.getElementById('file-name').textContent = FILE_NAME;

// -- Helpers --------------------------------------------------------------

/**
 * Render an array of row objects as an HTML table.
 * Applies a proportional bar-chart overlay to the last numeric column,
 * and truncates to MAX_ROWS with a notice when there are more rows.
 */
function renderTable(prepared, accentColor) {
    const rows = prepared.rows;
    if (rows.length === 0) {
        const p = document.createElement('p');
        p.className = 'empty';
        p.textContent = '(no data)';
        return p;
    }

    // Column kinds and maxima were computed once with the admitted scalar rows.
    const headers = prepared.columns.map(column => column.key);
    const lastColumn = prepared.columns[prepared.columns.length - 1];
    const colMax = lastColumn.kind === 'numeric' ? lastColumn.maximum : 0;
    const hasBarChart = colMax > 0;

    const displayRows = rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS) : rows;
    const wasTruncated = rows.length > MAX_ROWS;

    const frag = document.createDocumentFragment();
    const table = document.createElement('table');

    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    for (const h of headers) {
        const th = document.createElement('th');
        th.textContent = h;
        hrow.appendChild(th);
    }
    thead.appendChild(hrow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of displayRows) {
        const tr = document.createElement('tr');
        headers.forEach((h, idx) => {
            const td = document.createElement('td');
            const val = row[h];
            const str = val === null || val === undefined ? '' : String(val);
            td.textContent = str;

            // Proportional bar on the last numeric column.
            if (hasBarChart && idx === headers.length - 1) {
                const numV = parseFloat(str);
                if (!isNaN(numV) && numV > 0) {
                    const pct = ((numV / colMax) * 100).toFixed(1);
                    td.className = 'td-bar';
                    // CSS custom property gradient, avoids inline style repetition.
                    td.style.setProperty(
                        '--bar-gradient',
                        `linear-gradient(to right, color-mix(in srgb, ${accentColor} 20%, transparent) ${pct}%, transparent ${pct}%)`
                    );
                }
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    frag.appendChild(table);

    if (wasTruncated) {
        const notice = document.createElement('p');
        notice.className = 'truncation-notice';
        notice.textContent = 'Showing first ' + MAX_ROWS + ' of ' + rows.length + ' rows.';
        frag.appendChild(notice);
    }

    return frag;
}

// The extension has already separated nested JSON into scalar-only tables.
const container = document.getElementById('content');
if (TABLES.length === 0) { container.textContent = 'No result rows.'; }
for (const [index, table] of TABLES.entries()) {
    const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length];
    const section = document.createElement('div');
    section.className = 'section';
    section.style.setProperty('--section-color', accentColor);
    const heading = document.createElement('div');
    heading.className = 'section-title';
    heading.textContent = table.title;
    section.appendChild(heading);
    section.appendChild(renderTable(table, accentColor));
    container.appendChild(section);
}

// -- CSV export -----------------------------------------------------------

function csvEscape(value) {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function collectCsvFromTables() {
    const lines = [];
    for (const table of TABLES) {
        lines.push(csvEscape(table.title));
        lines.push(table.columns.map(column => csvEscape(column.key)).join(','));
        for (const row of table.rows) {
            lines.push(table.columns.map(column => csvEscape(row[column.key] ?? '')).join(','));
        }
        lines.push('');
    }
    return lines.join('\n');
}

document.getElementById('btn-export-csv').addEventListener('click', () => {
    const csv = collectCsvFromTables();
    if (csv) {
        vscode.postMessage({ command: 'exportCsv', csv });
    }
});
