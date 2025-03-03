import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let data = [];
let commits = [];
let xScale;
let yScale;
let selectedCommits = []; // Step 0: Declare selectedCommits as a top-level variable
let filteredCommits = []; // Variable for time-filtered commits
let commitProgress = 100; // Step 1.1: Track maximum time as percentage
let commitMaxTime; // Will hold the actual date corresponding to the slider
let timeScale; // Scale to map percentage to date

function createScatterPlot() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    
    // Clear previous SVG if it exists (for updates)
    d3.select('#chart').select('svg').remove();
    
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const [minDate, maxDate] = d3.extent(filteredCommits, d => d.date);

    const leftPaddingTime = (maxDate - minDate) * 0.05;
    const paddedMinDate = new Date(minDate - leftPaddingTime);

    xScale = d3
        .scaleTime()
        .domain([paddedMinDate, maxDate])
        .range([0, width])
        .nice();

    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const dots = svg.append('g').attr('class', 'dots');

    const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);
    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.date))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7)
        .style('--r', d => rScale(d.totalLines)) // For transition timing
        .attr('fill', 'steelblue')
        .classed('selected', d => isCommitSelected(d))
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget)
              .style('fill-opacity', 1)
              .classed('selected', true);
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event, commit) => {
            d3.select(event.currentTarget)
              .style('fill-opacity', 0.7)
              .classed('selected', isCommitSelected(commit));
            updateTooltipContent({});
            updateTooltipVisibility(false);
        });

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    brushSelector();
}

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
    
    // Step 1.1: Create time scale after processing commits
    timeScale = d3.scaleTime()
        .domain([
            d3.min(commits, d => d.datetime),
            d3.max(commits, d => d.datetime)
        ])
        .range([0, 100]);
    
    // Initialize commitMaxTime to the maximum date
    commitMaxTime = timeScale.invert(commitProgress);
    
    // Initialize filtered commits
    filterCommitsByTime();
    
    displayStats();
    initializeTimeSlider();
    createScatterPlot();
}

function processCommits() {
    commits = d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            let ret = {
                id: commit,
                url: 'https://github.com/YOUR_USERNAME/YOUR_REPO/commit/' + commit,
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
                configurable: true,
                writable: false,
                enumerable: true,
            });

            return ret;
        });
}

// Step 1.2: Filter commits by max time
function filterCommitsByTime() {
    filteredCommits = commits.filter(commit => commit.datetime <= commitMaxTime);
}

// Step 1.1: Initialize time slider
function initializeTimeSlider() {
    const timeSlider = document.getElementById('time-slider');
    timeSlider.value = commitProgress;
    updateTimeDisplay();
    
    timeSlider.addEventListener('input', updateTimeDisplay);
}

// Step 1.1: Update time display when slider changes
function updateTimeDisplay() {
    const timeSlider = document.getElementById('time-slider');
    commitProgress = Number(timeSlider.value);
    commitMaxTime = timeScale.invert(commitProgress);
    
    // Update the time display
    const selectedTime = document.getElementById('selectedTime');
    selectedTime.textContent = commitMaxTime.toLocaleString('en', {
        dateStyle: "long",
        timeStyle: "short"
    });
    
    // Update filtered commits and redraw
    filterCommitsByTime();
    createScatterPlot();
    displayCommitFiles();
}

function displayStats() {
    // Clear previous stats
    d3.select('#stats').html('');
    
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    const totalAuthors = d3.group(data, d => d.author).size;
    dl.append('dt').text('Total authors');
    dl.append('dd').text(totalAuthors);

    const totalFiles = d3.group(data, d => d.file).size;
    dl.append('dt').text('Total files');
    dl.append('dd').text(totalFiles);

    const totalDates = d3.group(data, d => d.date.toDateString()).size;
    dl.append('dt').text('Total unique commit dates');
    dl.append('dd').text(totalDates);
}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const author = document.getElementById('commit-author');
    const time = document.getElementById('commit-time');
    const loc = document.getElementById('commit-loc');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
    author.textContent = commit.author;
    time.textContent = commit.time;
    loc.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate position to avoid going off-screen
    // Start by positioning it to the right of the cursor
    let left = mouseX + 15; // 15px offset from cursor
    let top = mouseY - tooltipRect.height / 2; // Center vertically with cursor
    
    // Check if tooltip would go off the right edge of the screen
    if (left + tooltipRect.width > viewportWidth) {
        // Position to the left of the cursor instead
        left = mouseX - tooltipRect.width - 15;
    }
    
    // Check if tooltip would go off the top or bottom of the screen
    if (top < 0) {
        top = 10; // Small margin from top
    } else if (top + tooltipRect.height > viewportHeight) {
        top = viewportHeight - tooltipRect.height - 10; // Small margin from bottom
    }
    
    // Apply the calculated position
    tooltip.style.position = 'fixed'; // Fixed positioning relative to viewport
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.zIndex = '1000'; // Ensure it's above other elements
}

let brushSelection = null;

// Step 0: Update brushed function to directly update selectedCommits
function brushed(event) {
    const selection = event.selection;
    
    selectedCommits = !selection
        ? []
        : filteredCommits.filter((commit) => {
            const min = { x: selection[0][0], y: selection[0][1] };
            const max = { x: selection[1][0], y: selection[1][1] };
            const x = xScale(commit.date);
            const y = yScale(commit.hourFrac);

            return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
        });
    
    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}

// Step 0: Simplify isCommitSelected
function isCommitSelected(commit) {
    return selectedCommits.includes(commit);
}

function updateSelection() {
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function brushSelector() {
    const svg = document.querySelector('svg');
    d3.select(svg).call(d3.brush().on('start brush end', brushed));
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${
        selectedCommits.length || 'No'
    } commits selected`;

    return selectedCommits;
}

function updateLanguageBreakdown() {
    const requiredCommits = selectedCommits.length ? selectedCommits : filteredCommits;
    const container = document.getElementById('language-breakdown');

    container.innerHTML = '';
    
    if (requiredCommits.length === 0) {
        return;
    }
    
    const lines = requiredCommits.flatMap((d) => d.lines);

    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type
    );

    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }

    return breakdown;
}

// Step 2: Display files unit visualization
function displayCommitFiles() {
    // Get lines from filtered commits
    const lines = filteredCommits.flatMap(d => d.lines);
    
    // Create a color scale for file types
    const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
    
    // Group by file name
    let files = d3.groups(lines, d => d.file)
        .map(([name, lines]) => ({ name, lines }));
    
    // Step 2.3: Sort files by number of lines (descending)
    files = d3.sort(files, d => -d.lines.length);
    
    // Clear previous visualization
    d3.select('.files').selectAll('div').remove();
    
    // Create file containers
    const filesContainer = d3.select('.files').selectAll('div')
        .data(files)
        .enter()
        .append('div');
    
    // Add file names with line counts
    filesContainer.append('dt')
        .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
    
    // Add unit visualization (one dot per line)
    filesContainer.append('dd')
        .selectAll('div')
        .data(d => d.lines)
        .enter()
        .append('div')
        .attr('class', 'line')
        .style('background', d => fileTypeColors(d.type));
}

// Step 3: Scrollytelling for commits
function initializeScrollytelling() {
    const NUM_ITEMS = commits.length;
    const ITEM_HEIGHT = 80; // Taller to fit narrative text
    const VISIBLE_COUNT = 10;
    const totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
    
    const scrollContainer = d3.select('#scroll-container');
    const spacer = d3.select('#spacer');
    spacer.style('height', `${totalHeight}px`);
    
    scrollContainer.on('scroll', () => {
        const scrollTop = scrollContainer.property('scrollTop');
        let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
        startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
        renderItems(startIndex);
    });
    
    // Initial render
    renderItems(0);
}

function renderItems(startIndex) {
    const ITEM_HEIGHT = 80;
    const VISIBLE_COUNT = 10;
    
    // Get visible commits slice
    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    const visibleCommits = commits.slice(startIndex, endIndex);
    
    // Update the scatter plot with visible commits
    filteredCommits = visibleCommits;
    createScatterPlot();
    
    // Clear previous items
    d3.select('#items-container').selectAll('div').remove();
    
    // Create narrative items
    d3.select('#items-container').selectAll('div')
        .data(visibleCommits)
        .enter()
        .append('div')
        .attr('class', 'item')
        .html((commit, index) => `
            <p>
                On ${commit.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})}, I made
                <a href="${commit.url}" target="_blank">
                    ${index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
                </a>. 
                I edited ${commit.totalLines} lines across 
                ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files.
                Then I looked over all I had made, and I saw that it was very good.
            </p>
        `)
        .style('position', 'absolute')
        .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`);
    
    // Update files visualization
    displayCommitFiles();
}

// Step 4: Scrollytelling for files
function initializeFilesScrollytelling() {
    // Extract all files from commits
    const allLines = commits.flatMap(d => d.lines);
    let allFiles = d3.groups(allLines, d => d.file)
        .map(([name, lines]) => ({ name, lines }));
    
    // Sort by size
    allFiles = d3.sort(allFiles, d => -d.lines.length);
    
    const NUM_FILES = allFiles.length;
    const ITEM_HEIGHT = 80;
    const VISIBLE_COUNT = 10;
    const totalHeight = (NUM_FILES - 1) * ITEM_HEIGHT;
    
    const scrollContainer = d3.select('#files-scroll-container');
    const spacer = d3.select('#files-spacer');
    spacer.style('height', `${totalHeight}px`);
    
    scrollContainer.on('scroll', () => {
        const scrollTop = scrollContainer.property('scrollTop');
        let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
        startIndex = Math.max(0, Math.min(startIndex, allFiles.length - VISIBLE_COUNT));
        renderFileItems(startIndex, allFiles);
    });
    
    // Initial render
    renderFileItems(0, allFiles);
}

function renderFileItems(startIndex, allFiles) {
    const ITEM_HEIGHT = 80;
    const VISIBLE_COUNT = 10;
    
    // Get visible files slice
    const endIndex = Math.min(startIndex + VISIBLE_COUNT, allFiles.length);
    const visibleFiles = allFiles.slice(startIndex, endIndex);
    
    // Clear previous items
    d3.select('#files-items-container').selectAll('div').remove();
    
    // Create narrative items for files
    d3.select('#files-items-container').selectAll('div')
        .data(visibleFiles)
        .enter()
        .append('div')
        .attr('class', 'item')
        .html((file, index) => `
            <p>
                The file <code>${file.name}</code> contains ${file.lines.length} lines of code.
                ${index === 0 ? "It's the largest file in the project." : ""}
                ${index === 1 ? "It's the second largest file in the project." : ""}
                This file is primarily written in 
                ${d3.rollups(file.lines, v => v.length, d => d.type)
                   .sort((a, b) => b[1] - a[1])[0][0]}.
            </p>
        `)
        .style('position', 'absolute')
        .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`);
    
    // Update the files visualization with only visible files
    updateFileVisualization(visibleFiles);
}

function updateFileVisualization(files) {
    // Create a color scale for file types
    const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
    
    // Clear previous visualization
    d3.select('.files').selectAll('div').remove();
    
    // Create file containers
    const filesContainer = d3.select('.files').selectAll('div')
        .data(files)
        .enter()
        .append('div');
    
    // Add file names with line counts
    filesContainer.append('dt')
        .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
    
    // Add unit visualization (one dot per line)
    filesContainer.append('dd')
        .selectAll('div')
        .data(d => d.lines)
        .enter()
        .append('div')
        .attr('class', 'line')
        .style('background', d => fileTypeColors(d.type));
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    
    // After switching to scrollytelling, this will replace the time slider
    initializeScrollytelling();
    initializeFilesScrollytelling();
});