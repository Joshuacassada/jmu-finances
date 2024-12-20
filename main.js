import * as d3 from 'd3';
import * as d3Sankey from "d3-sankey";

const width = 928;
const height = 600;
const format = d3.format(",.0f");
const linkColor = "source-target"; // source, target, source-target, or a color string.

// Create a SVG container.
const svg = d3.create("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

// Constructs and configures a Sankey generator.
const sankey = d3Sankey.sankey()
  .nodeId(d => d.name)
  .nodeAlign(d3Sankey.sankeyJustify) // d3.sankeyLeft, etc.
  .nodeWidth(15)
  .nodePadding(10)
  .extent([[1, 5], [width - 1, height - 5]]);

function forDiagram4(jmuData) {
  const athleticsData = jmuData["jmu-athletics"];
  const nodes = getNodes(athleticsData);
  const links = getLinks(athleticsData, nodes);
  return { nodes, links };
}

function getNodes(athleticsData) {
  const sportPrograms = ['football', 'men\'s basketball', 'women\'s basketball', 'other sports', 'non-program specific'];
  const col1Nodes = sportPrograms.map(sport => ({
    name: `source-${sport}`,
    title: sport.charAt(0).toUpperCase() + sport.slice(1)
  }));

  const col2Nodes = athleticsData
    .slice(0, 11)
    .map(item => ({
      name: `revenue-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
      title: item.name
    }));

  const col3Nodes = [{
    name: 'jmu-athletics',
    title: 'JMU Athletics'
  }];

  const col4Nodes = athleticsData
    .slice(11)
    .map(item => ({
      name: `expense-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
      title: item.name
    }));

  const col5Nodes = sportPrograms.map(sport => ({
    name: `target-${sport}`,
    title: sport.charAt(0).toUpperCase() + sport.slice(1)
  }));

  return [...col1Nodes, ...col2Nodes, ...col3Nodes, ...col4Nodes, ...col5Nodes];
}

function getLinks(athleticsData, nodes) {
  const links = [];
  const sportColumns = ['Football', 'Men\'s Basketball', 'Women\'s Basketball', 'Other sports', 'Non-Program Specific'];
  
  athleticsData.slice(0, 11).forEach(revenueItem => {
    sportColumns.forEach(sport => {
      if (revenueItem[sport] > 0) {
        links.push({
          source: `source-${sport.toLowerCase()}`,
          target: `revenue-${revenueItem.name.toLowerCase().replace(/\s+/g, '-')}`,
          value: revenueItem[sport]
        });
      }
    });
  });

  athleticsData.slice(0, 11).forEach(revenueItem => {
    links.push({
      source: `revenue-${revenueItem.name.toLowerCase().replace(/\s+/g, '-')}`,
      target: 'jmu-athletics',
      value: revenueItem.Total
    });
  });

  athleticsData.slice(11).forEach(expenseItem => {
    links.push({
      source: 'jmu-athletics',
      target: `expense-${expenseItem.name}`,
      value: expenseItem.Total
    });
  });

  athleticsData.slice(11).forEach(expenseItem => {
    sportColumns.forEach(sport => {
      if (expenseItem[sport] > 0) {
        links.push({
          source: `expense-${expenseItem.name}`,
          target: `target-${sport.toLowerCase()}`,
          value: expenseItem[sport]
        });
      }
    });
  });

  return links;
}

async function init() {
  const jmuData = await d3.json("data/jmu.json");
  const data = forDiagram4(jmuData);

  // Applies it to the data
  const { nodes, links } = sankey({
    nodes: data.nodes.map(d => Object.assign({}, d)),
    links: data.links.map(d => Object.assign({}, d))
  });

  // Defines a color scale.
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Creates the rects that represent the nodes.
  const rect = svg.append("g")
    .attr("stroke", "#000")
    .selectAll()
    .data(nodes)
    .join("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", d => color(d.category));

  // Adds a title on the nodes.
  rect.append("title")
    .text(d => `${d.name}\n${format(d.value)}`);

  // Creates the paths that represent the links.
  const link = svg.append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.5)
    .selectAll()
    .data(links)
    .join("g")
    .style("mix-blend-mode", "multiply");

  // Creates a gradient, if necessary, for the source-target color option.
  if (linkColor === "source-target") {
    const gradient = link.append("linearGradient")
      .attr("id", d => `link-${d.index}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", d => d.source.x1)
      .attr("x2", d => d.target.x0);
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", d => color(d.source.category));
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", d => color(d.target.category));
  }

  link.append("path")
    .attr("d", d3Sankey.sankeyLinkHorizontal())
    .attr("stroke", linkColor === "source-target" ? d => `url(#link-${d.index})`
      : linkColor === "source" ? d => color(d.source.category)
        : linkColor === "target" ? d => color(d.target.category)
          : linkColor)
    .attr("stroke-width", d => Math.max(1, d.width));

  link.append("title")
    .text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)}`);

  // Adds labels on the nodes.
  svg.append("g")
    .selectAll()
    .data(nodes)
    .join("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .text(d => d.title);

  // Adds labels on the links.
  svg.append("g")
    .selectAll()
    .data(links)
    .join("text")
    .attr("x", d => {
      const midX = (d.source.x1 + d.target.x0) / 2;
      return midX < width / 2 ? midX + 6 : midX - 6;
    })
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .text(d => `${d.source.title} → ${format(d.value)} → ${d.target.title}`);

  const svgNode = svg.node();
  document.body.appendChild(svgNode);
  return svgNode;
}

init();