
import { GameState, City } from '../types';

export class DataLogger {
  static generateMarkdownReport(state: GameState, city: City): string {
    const totalWaiting = state.stations.reduce((acc, s) => acc + s.waitingPassengers.length, 0);
    const totalLines = state.lines.length;
    const totalTrains = state.lines.reduce((acc, l) => acc + l.trains.length, 0);
    const durationMinutes = (state.daysElapsed * 24 * 60) / 1440; // simplified day to real-ish time or just game days

    let report = `# MINI METRO SYSTEM REPORT: ${city.name.toUpperCase()}\n\n`;
    report += `## Session Summary\n`;
    report += `- **Final Score (Throughput):** ${state.score}\n`;
    report += `- **Operational Week:** ${state.level}\n`;
    report += `- **Game Mode:** ${state.mode}\n`;
    report += `- **Difficulty Rating:** ${city.difficulty}\n`;
    report += `- **Days Operational:** ${state.daysElapsed.toFixed(1)}\n\n`;

    report += `## Infrastructure Status\n`;
    report += `- **Transit Lines:** ${totalLines} / ${state.totalResources.lines}\n`;
    report += `- **Locomotives:** ${totalTrains} / ${state.totalResources.trains}\n`;
    report += `- **Water Crossings:** ${state.totalResources.tunnels + state.totalResources.bridges - (state.resources.tunnels + state.resources.bridges)}\n`;
    report += `- **Unconnected Stations:** ${state.stations.filter(s => !state.lines.some(l => l.stations.includes(s.id))).length}\n\n`;

    report += `## Passenger Analytics\n`;
    report += `- **Total Waiting:** ${totalWaiting}\n`;
    report += `- **Network Saturation:** ${((totalWaiting / (state.stations.length * 8)) * 100).toFixed(1)}%\n\n`;

    report += `## Resource Usage Timeline\n`;
    report += `| Timestamp (ms) | Score | Stations | Waiting | Lines Used | Trains Used |\n`;
    report += `|----------------|-------|----------|---------|------------|-------------|\n`;
    state.analytics.forEach(log => {
      report += `| ${Math.floor(log.timestamp)} | ${log.score} | ${log.stationCount} | ${log.waitingTotal} | ${log.lineCount} | ${log.trainCount} |\n`;
    });

    return report;
  }

  static downloadReport(state: GameState, city: City) {
    const markdown = this.generateMarkdownReport(state, city);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mini-metro-report-${city.id}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
