// Global variables
let data = [];
let commits = [];
const width = 1000;
const height = 600;
const margin = { top: 10, right: 10, bottom: 30, left: 20 };
let brushSelection = null;

// Calculate usable area
const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
};

// Load and process data
async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    processCommits();
    createScatterplot();
    displayStats();
    brushSelector();
}

// Process commits
function processCommits() {
    commits = d3.groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            
            let ret = {
                id: commit,
                url: 'https://github.com/YOUR_REPO/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                configurable: true,
                writable: true
            });

            return ret;
        });
}

// Create scatterplot
function createScatterplot() {
    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Create scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    // Add gridlines
    const gridlines = svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3.axisLeft(yScale)
            .tickFormat('')
            .tickSize(-usableArea.width)
    );

    // Sort commits by size
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    // Add dots
    const dots = svg.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipContent({});
            updateTooltipVisibility(false);
        });

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);
}

// Display statistics
function displayStats() {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // Additional stats
    const avgFileLength = d3.mean(
        d3.rollups(data, v => d3.max(v, d => d.line), d => d.file),
        d => d[1]
    );
    dl.append('dt').text('Average file length');
    dl.append('dd').text(Math.round(avgFileLength) + ' lines');
}

// Tooltip functions
function updateTooltipContent(commit) {
    if (Object.keys(commit).length === 0) return;

    document.getElementById('commit-link').href = commit.url;
    document.getElementById('commit-link').textContent = commit.id;
    document.getElementById('commit-date').textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full'
    });
    document.getElementById('commit-time').textContent = commit.time;
    document.getElementById('commit-author').textContent = commit.author;
    document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

// Brush functions
function brushSelector() {
    const svg = document.querySelector('svg');
    d3.select(svg)
        .call(d3.brush().on('start brush end', brushed));
    
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
    const selectedCommits = updateSelectionCount();
    updateLanguageBreakdown(selectedCommits);
}

function isCommitSelected(commit) {
    if (!brushSelection) return false;
    
    const [[x0, y0], [x1, y1]] = brushSelection;
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);
    
    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
}

function updateSelection() {
    d3.selectAll('circle').classed('selected', d => isCommitSelected(d));
}

function updateSelectionCount() {
    const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
    document.getElementById('selection-count').textContent = 
        `${selectedCommits.length || 'No'} commits selected`;
    return selectedCommits;
}

function updateLanguageBreakdown(selectedCommits) {
    const container = document.getElementById('language-breakdown');
    
    if (!selectedCommits?.length) {
        container.innerHTML = '';
        return;
    }

    const lines = selectedCommits.flatMap(d => d.lines);
    const breakdown = d3.rollup(
        lines,
        v => v.length,
        d => d.type
    );

    container.innerHTML = '';
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);
        container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', loadData);