import { PROFILER_STYLE_ID } from "./constants";

export function createProfilerStyles(): HTMLStyleElement {
  const style = document.createElement("style");
  style.id = PROFILER_STYLE_ID;
  style.textContent = `
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600&display=swap");

#qf-profiler {
  color: #e7f4f2;
  font-family: "Space Grotesk", "Segoe UI", system-ui, sans-serif;
}

#qf-profiler .qf-profiler__panel {
  width: 340px;
  max-height: calc(100vh - 24px);
  background: linear-gradient(180deg, rgba(14, 20, 24, 0.9), rgba(6, 10, 12, 0.92));
  border: 1px solid rgba(150, 220, 215, 0.2);
  border-radius: 14px;
  padding: 12px 12px 10px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10px) saturate(140%);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

#qf-profiler .qf-profiler__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

#qf-profiler .qf-profiler__title {
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #98e6dd;
}

#qf-profiler .qf-profiler__subtitle {
  font-size: 11px;
  color: rgba(231, 244, 242, 0.6);
  margin-top: 2px;
}

#qf-profiler .qf-profiler__badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(20, 30, 32, 0.6);
}

#qf-profiler .qf-profiler__badge--good {
  color: #7bf1c8;
  border-color: rgba(123, 241, 200, 0.4);
}

#qf-profiler .qf-profiler__badge--warn {
  color: #f7c25c;
  border-color: rgba(247, 194, 92, 0.4);
}

#qf-profiler .qf-profiler__badge--bad {
  color: #ff8b8b;
  border-color: rgba(255, 139, 139, 0.4);
}

#qf-profiler .qf-profiler__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

#qf-profiler .qf-profiler__metric {
  padding: 8px;
  border-radius: 10px;
  background: rgba(12, 18, 20, 0.75);
  border: 1px solid rgba(100, 160, 160, 0.2);
}

#qf-profiler .qf-profiler__label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(231, 244, 242, 0.6);
}

#qf-profiler .qf-profiler__value {
  font-size: 16px;
  font-weight: 600;
  color: #f0fffd;
  margin-top: 4px;
}

#qf-profiler .qf-profiler__sub {
  font-size: 11px;
  color: rgba(231, 244, 242, 0.7);
  margin-top: 3px;
}

#qf-profiler .qf-profiler__pressure {
  margin: 10px 0 8px;
}

#qf-profiler .qf-profiler__pressure-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(90, 130, 130, 0.25);
  overflow: hidden;
}

#qf-profiler .qf-profiler__pressure-bar span {
  display: block;
  height: 100%;
  width: var(--bar, 0%);
  transition: width 0.2s ease;
  background: linear-gradient(90deg, rgba(111, 231, 202, 0.9), rgba(38, 210, 197, 0.9));
}

#qf-profiler .qf-profiler__pressure-bar--warn span {
  background: linear-gradient(90deg, rgba(247, 194, 92, 0.95), rgba(244, 155, 80, 0.95));
}

#qf-profiler .qf-profiler__pressure-bar--bad span {
  background: linear-gradient(90deg, rgba(255, 139, 139, 0.95), rgba(255, 95, 95, 0.95));
}

#qf-profiler .qf-profiler__sparkline {
  height: 46px;
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid rgba(90, 150, 150, 0.2);
  background: rgba(10, 16, 18, 0.8);
}

#qf-profiler .qf-profiler__sparkline svg {
  width: 100%;
  height: 100%;
}

#qf-profiler .qf-profiler__sparkline-line {
  stroke: #6fe7d8;
  stroke-width: 1.6;
  fill: none;
}

#qf-profiler .qf-profiler__sparkline-budget {
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

#qf-profiler .qf-profiler__sections {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  min-height: 0;
}

#qf-profiler .qf-profiler__group-title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(231, 244, 242, 0.62);
  margin-bottom: 4px;
}

#qf-profiler .qf-profiler__section {
  padding: 8px;
  border-radius: 10px;
  background: rgba(10, 16, 18, 0.8);
  border: 1px solid rgba(90, 150, 150, 0.18);
}

#qf-profiler .qf-profiler__section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

#qf-profiler .qf-profiler__section-name {
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  color: #c8fff4;
}

#qf-profiler .qf-profiler__section-ms {
  font-size: 12px;
  color: rgba(231, 244, 242, 0.7);
}

#qf-profiler .qf-profiler__section-values {
  font-size: 10px;
  color: rgba(231, 244, 242, 0.6);
  margin-bottom: 6px;
}

#qf-profiler .qf-profiler__section-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(90, 130, 130, 0.25);
  overflow: hidden;
}

#qf-profiler .qf-profiler__section-bar span {
  display: block;
  height: 100%;
  width: var(--bar, 0%);
  transition: width 0.2s ease;
  background: linear-gradient(90deg, rgba(111, 231, 202, 0.9), rgba(38, 210, 197, 0.9));
}

#qf-profiler .qf-profiler__section-bar--warn span {
  background: linear-gradient(90deg, rgba(247, 194, 92, 0.95), rgba(244, 155, 80, 0.95));
}

#qf-profiler .qf-profiler__section-bar--bad span {
  background: linear-gradient(90deg, rgba(255, 139, 139, 0.95), rgba(255, 95, 95, 0.95));
}

#qf-profiler .qf-profiler__table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  background: rgba(10, 16, 18, 0.8);
  border: 1px solid rgba(90, 150, 150, 0.18);
  border-radius: 10px;
  overflow: hidden;
}

#qf-profiler .qf-profiler__table-head {
  text-align: right;
  font-size: 10px;
  letter-spacing: 0.05em;
  color: rgba(231, 244, 242, 0.72);
  padding: 7px 8px;
  border-bottom: 1px solid rgba(90, 150, 150, 0.18);
  background: rgba(16, 24, 28, 0.8);
}

#qf-profiler .qf-profiler__table-head--name {
  text-align: left;
}

#qf-profiler .qf-profiler__table-cell {
  text-align: right;
  font-size: 11px;
  color: rgba(231, 244, 242, 0.86);
  padding: 7px 8px;
  border-bottom: 1px solid rgba(90, 150, 150, 0.12);
}

#qf-profiler .qf-profiler__table-cell--name {
  text-align: left;
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  color: #c8fff4;
}

#qf-profiler .qf-profiler__table-row:last-child .qf-profiler__table-cell {
  border-bottom: none;
}

#qf-profiler .qf-profiler__actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

#qf-profiler .qf-profiler__button {
  background: rgba(16, 26, 28, 0.9);
  color: #c8fff4;
  border: 1px solid rgba(100, 160, 160, 0.3);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 11px;
  letter-spacing: 0.03em;
  cursor: pointer;
}

#qf-profiler .qf-profiler__button:hover {
  border-color: rgba(140, 220, 210, 0.5);
}

#qf-profiler .qf-profiler__empty {
  padding: 8px;
  border-radius: 8px;
  text-align: center;
  font-size: 11px;
  color: rgba(231, 244, 242, 0.6);
  border: 1px dashed rgba(90, 150, 150, 0.25);
}

@media (max-width: 720px) {
  #qf-profiler .qf-profiler__panel {
    width: 260px;
  }
  #qf-profiler .qf-profiler__grid {
    grid-template-columns: 1fr;
  }
}
`;
  document.head.appendChild(style);
  return style;
}
