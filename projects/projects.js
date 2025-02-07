import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";


let projects = [];
let query = '';
let selectedIndex = -1;

function createPieChart(projectsToShow) {
    let rolledData = d3.rollups(
        projectsToShow,
        (v) => v.length,
        (d) => d.year
    );

    let data = rolledData.map(([year, count]) => {
        return { value: count, label: year}
    });

    const svg = d3.select('#projects-pie-plot')
    svg.selectAll('path').remove();
    d3.select('.legend').selectAll('li').remove();

    let arcGenerator = d3.arc().innerRadius(0).outerRadius(25);
    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcData = sliceGenerator(data);
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    arcData.forEach((d, i) => {
        svg.append('path')
            .attr('d', arcGenerator(d))
            .attr('fill', colors(i))
            .attr('class', selectedIndex === i ? 'selected' : '')
            .on('click', () => {
                selectedIndex = selectedIndex === i ? -1 : i;
                
                svg.selectAll('path')
                    .attr('class', (_, idx) => selectedIndex === idx ? 'selected' : '');
                
                d3.select('.legend')
                    .selectAll('li')
                    .attr('class', (_, idx) => selectedIndex === idx ? 'selected' : '');

                let filteredProjects = projects.filter(project => {
                    let matchesSearch = true;
                    if (query) {
                        let values = Object.values(project).join('\n').toLowerCase();
                        matchesSearch = values.includes(query.toLowerCase());
                    }

                    let matchesYear = true;
                    if (selectedIndex !== -1) {
                        matchesYear = project.year === data[selectedIndex].label;
                    }

                    return matchesSearch && matchesYear;
                });

                renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
            });
    });
    
    let legend = d3.select('.legend');
    data.forEach((d, idx) => {
        legend.append('li')
            .attr('style', `--color:${colors(idx)}`)
            .attr('class', selectedIndex === idx ? 'selected' : '')
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });

}

async function initProjects() {
    try {
        projects = await fetchJSON('../lib/projects.json');
        const projectsContainer = document.querySelector('.projects');
        const searchInput = document.querySelector('.searchBar');

        if (projectsContainer) {
            renderProjects(projects, projectsContainer, 'h2');
            createPieChart(projects);

            searchInput.addEventListener('input', (event) => {
                query = event.target.value;
                selectedIndex = -1;
                
                let filteredProjects = projects.filter((project) => {
                    let values = Object.values(project).join('\n').toLowerCase();
                    return values.includes(query.toLowerCase());
                });

                renderProjects(filteredProjects, projectsContainer, 'h2');
                createPieChart(filteredProjects);
            });
        }
    } catch (error) {
        console.error('Failed to initialize projects:', error);
    }
}

initProjects();

initProjects();

